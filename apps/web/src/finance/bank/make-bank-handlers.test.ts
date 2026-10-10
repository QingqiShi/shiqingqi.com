import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { accounts, bankLinks, connections, valuations } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import {
  createFakeBankClient,
  type FakeBankFixture,
} from "./lunchflow/create-fake-bank-client.ts";
import { createLunchFlowClient } from "./lunchflow/create-lunch-flow-client.ts";
import {
  serveFakeLunchFlow,
  type FakeLunchFlowServer,
} from "./lunchflow/testing/serve-fake-lunch-flow.ts";
import {
  makeBankHandlers,
  type BankHandlerDependencies,
} from "./make-bank-handlers.ts";
import { makeBankProvider } from "./make-bank-provider.ts";
import { seedUncategorised } from "./testing/seed-bank-link.ts";
import type {
  BankConnection,
  BankLinkView,
  CredentialView,
  ProviderAccountsResponse,
  SyncNowResponse,
} from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-10-10T12:00:00Z");
const DB_HOOK_TIMEOUT = 60_000;
const CREDENTIAL_KEY = new Uint8Array(randomBytes(32));

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let fixture: FakeBankFixture;
let connected: boolean;

function providerAccount(id: string, currency = "GBP", status = "ACTIVE") {
  return {
    id,
    connectionId: "c1",
    name: `Account ${id}`,
    institution: "Example Bank",
    institutionLogo: null,
    provider: "gocardless",
    currency,
    status,
  };
}

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  await seedUncategorised(db, home);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
  connected = true;
  fixture = {
    accounts: [
      providerAccount("p1"),
      providerAccount("p2", "GBP", "DISCONNECTED"),
      providerAccount("usd", "USD"),
    ],
    transactions: {
      p1: [
        {
          id: "t1",
          date: "2026-10-08",
          amountMinor: -1000,
          currency: "GBP",
          merchant: "",
          description: "SHOP",
          raw: {},
        },
      ],
    },
    balances: {
      p1: { amountMinor: -400, currency: "GBP" },
      p2: { amountMinor: 0, currency: "GBP" },
    },
  };
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handlers(overrides: Partial<BankHandlerDependencies> = {}) {
  return makeBankHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    getBankClient: (): Promise<BankConnection> =>
      Promise.resolve(
        connected
          ? {
              status: "connected",
              mode: "fake",
              credential: { lastFour: "abcd", savedAt: NOW.toISOString() },
              client: createFakeBankClient(fixture),
            }
          : { status: "not_connected" },
      ),
    verifyApiKey: () => Promise.resolve(),
    credentialKey: () => CREDENTIAL_KEY,
    getModel: () => null,
    now: () => NOW,
    ...overrides,
  });
}

function request(
  path: string,
  init: { method?: string; body?: unknown; origin?: string | null } = {},
) {
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  return new Request(`${ORIGIN}/api/finance/bank/${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(origin === null ? {} : { Origin: origin }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function putLink(body: unknown) {
  return handlers().putLink(request("links", { method: "PUT", body }));
}

async function listAccounts() {
  const response = await handlers().listAccounts(request("accounts"));
  return (await response.json()) as ProviderAccountsResponse;
}

describe("makeBankHandlers", () => {
  it("needs a session, and a same-origin request to write", async () => {
    session = null;
    expect((await handlers().listAccounts(request("accounts"))).status).toBe(
      401,
    );
    session = {
      sessionId: randomUUID(),
      userId: randomUUID(),
      householdId: home.householdId,
      memberId: home.memberId,
      role: "owner",
    };
    const response = await handlers().putLink(
      request("links", {
        method: "PUT",
        origin: "https://evil.example",
        body: { accountId: home.currentId, providerAccountId: "p1" },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("says when no bank provider is set up", async () => {
    connected = false;
    expect(await listAccounts()).toEqual({ status: "not_connected" });
    const response = await putLink({
      accountId: home.currentId,
      providerAccountId: "p1",
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not-connected" });
  });

  it("links an account and shows the link next to its provider account", async () => {
    const response = await putLink({
      accountId: home.currentId,
      providerAccountId: "p1",
    });
    expect(response.status).toBe(200);
    const link = (await response.json()) as BankLinkView;
    expect(link).toMatchObject({
      accountId: home.currentId,
      signMultiplier: 1,
      status: "active",
      lastSyncedOn: null,
    });

    const listed = await listAccounts();
    expect(listed.status).toBe("connected");
    if (listed.status !== "connected") return;
    expect(
      listed.accounts.map((account) => [
        account.providerAccountId,
        account.needsReconnect,
        account.link?.id ?? null,
      ]),
    ).toEqual([
      ["p1", false, link.id],
      ["p2", true, null],
      ["usd", false, null],
    ]);
  });

  it("refuses accounts that cannot be linked", async () => {
    const investmentId = randomUUID();
    await db.insert(accounts).values({
      id: investmentId,
      householdId: home.householdId,
      groupId: home.liquidGroupId,
      name: "ISA",
      kind: "investment",
      currency: "GBP",
      version: 0,
    });
    const cases = [
      [
        { accountId: investmentId, providerAccountId: "p1" },
        "unlinkable-account",
      ],
      [{ accountId: randomUUID(), providerAccountId: "p1" }, "unknown-account"],
      [
        { accountId: home.currentId, providerAccountId: "nope" },
        "unknown-provider-account",
      ],
      [
        { accountId: home.currentId, providerAccountId: "usd" },
        "currency-mismatch",
      ],
      [
        {
          accountId: home.currentId,
          providerAccountId: "p1",
          signMultiplier: 2,
        },
        "invalid-body",
      ],
    ] as const;
    for (const [body, error] of cases) {
      const response = await putLink(body);
      expect(await response.json()).toEqual({ error });
    }
    expect(await db.select().from(bankLinks)).toEqual([]);
  });

  it("refuses a provider account another account holds, until that link is removed", async () => {
    const first = (await (
      await putLink({ accountId: home.currentId, providerAccountId: "p1" })
    ).json()) as BankLinkView;
    const taken = await putLink({
      accountId: home.cardId,
      providerAccountId: "p1",
    });
    expect(taken.status).toBe(409);

    const removed = await handlers().removeLink(
      request(`links?linkId=${first.id}`, { method: "DELETE" }),
    );
    expect(removed.status).toBe(204);
    const moved = await putLink({
      accountId: home.cardId,
      providerAccountId: "p1",
      signMultiplier: -1,
    });
    expect(moved.status).toBe(200);
    expect(await moved.json()).toMatchObject({
      accountId: home.cardId,
      signMultiplier: -1,
    });

    const relinked = (await (
      await putLink({ accountId: home.currentId, providerAccountId: "p2" })
    ).json()) as BankLinkView;
    expect(relinked.id).toBe(first.id);
  });

  it("syncs now and takes the bank balance as a bank Valuation", async () => {
    await putLink({ accountId: home.currentId, providerAccountId: "p1" });

    const response = await handlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );
    const result = (await response.json()) as SyncNowResponse;
    expect(result.links).toMatchObject([
      { error: null, created: 1, balanceDifferenceMinor: 600 },
    ]);
    expect(result.clock).toBeGreaterThan(0);

    const [link] = await db.select().from(bankLinks);
    const resolved = await handlers().resolveBalance(
      request("balance", {
        method: "POST",
        body: { linkId: link.id, action: "use" },
      }),
    );
    expect(resolved.status).toBe(200);
    expect(await db.select().from(valuations)).toMatchObject([
      {
        accountId: home.currentId,
        on: "2026-10-10",
        amountMinor: -400,
        source: "bank",
      },
    ]);
    const [after] = await db
      .select()
      .from(bankLinks)
      .where(eq(bankLinks.id, link.id));
    expect(after.balanceDifferenceMinor).toBeNull();
  });

  it("lets only the owner link, unlink or sync accounts", async () => {
    await putLink({ accountId: home.currentId, providerAccountId: "p1" });
    const [link] = await db.select().from(bankLinks);
    session = session && { ...session, role: "member" };

    const put = await putLink({
      accountId: home.savingsId,
      providerAccountId: "p2",
    });
    const removed = await handlers().removeLink(
      request(`links?linkId=${link.id}`, { method: "DELETE" }),
    );
    const synced = await handlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );

    expect(put.status).toBe(403);
    expect(await put.json()).toEqual({ error: "owner-only" });
    expect(removed.status).toBe(403);
    expect(synced.status).toBe(403);
  });

  it("limits how often a Household syncs now", async () => {
    const limited = handlers({
      limitRequest: () => Promise.resolve({ success: false, reset: 0 }),
    });

    const response = await limited.syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "too-many-requests" });
    expect(response.headers.get("Retry-After")).toBe("1");
  });

  it("answers rate_limited when the bank refused every link", async () => {
    await putLink({ accountId: home.currentId, providerAccountId: "p1" });
    fixture.errors = { p1: "rate_limited" };

    const response = await handlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
    const [link] = await db.select().from(bankLinks);
    expect(link).toMatchObject({ status: "active", lastError: "rate_limited" });
  });
});

describe("the Lunch Flow API key", () => {
  const API_KEY = "lf-live-key-0123456789-wxyz";
  let lunchFlow: FakeLunchFlowServer;

  beforeEach(async () => {
    lunchFlow = await serveFakeLunchFlow({
      apiKey: API_KEY,
      accounts: [
        {
          id: 101,
          connection_id: 7,
          name: "Everyday",
          institution_name: "Example Bank",
          institution_logo: null,
          provider: "gocardless",
          currency: "GBP",
          status: "ACTIVE",
          transactions: [],
          balance: { amount: 10, currency: "GBP" },
        },
      ],
    });
  });

  afterEach(async () => {
    await lunchFlow.close();
  });

  /** The handlers as production wires them, with Lunch Flow on a local server. */
  function realHandlers() {
    const provider = makeBankProvider({
      fake: () => false,
      credentialKey: () => CREDENTIAL_KEY,
      createClient: (apiKey) =>
        createLunchFlowClient({
          apiKey,
          baseUrl: lunchFlow.baseUrl,
          retries: 0,
        }),
    });
    return handlers({
      getBankClient: provider.getBankClient,
      verifyApiKey: provider.verifyApiKey,
    });
  }

  function putCredential(apiKey: string) {
    return realHandlers().putCredential(
      request("credential", { method: "PUT", body: { apiKey } }),
    );
  }

  function removeCredential() {
    return realHandlers().removeCredential(
      request("credential", { method: "DELETE" }),
    );
  }

  async function listedAccounts() {
    const response = await realHandlers().listAccounts(request("accounts"));
    return { text: await response.text(), status: response.status };
  }

  it("connects the Household with a key Lunch Flow takes, and never sends the key back", async () => {
    expect(JSON.parse((await listedAccounts()).text)).toEqual({
      status: "not_connected",
    });

    const response = await putCredential(API_KEY);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      lastFour: "wxyz",
      savedAt: NOW.toISOString(),
    } satisfies CredentialView);
    const listed = await listedAccounts();
    expect(JSON.parse(listed.text)).toMatchObject({
      status: "connected",
      mode: "real",
      credential: { lastFour: "wxyz", savedAt: NOW.toISOString() },
      accounts: [{ providerAccountId: "101", name: "Everyday" }],
    });
    expect(listed.text).not.toContain(API_KEY);
    const [row] = await db.select().from(connections);
    expect(row.credential).not.toBeNull();
    expect(Buffer.from(row.credential ?? []).toString("latin1")).not.toContain(
      API_KEY,
    );
    const pulled = await pullChanges(db, home.householdId, -1);
    expect(JSON.stringify(pulled)).not.toContain(API_KEY);
    expect(JSON.stringify(pulled)).not.toContain("wxyz");
  });

  it("refuses a key Lunch Flow refuses, and keeps nothing", async () => {
    const response = await putCredential("lf-wrong-key-000000");

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "auth" });
    expect(await db.select().from(connections)).toEqual([]);
  });

  it("refuses to store a key when the server has no credential key", async () => {
    const response = await handlers({
      credentialKey: () => null,
    }).putCredential(
      request("credential", { method: "PUT", body: { apiKey: API_KEY } }),
    );

    expect(response.status).toBe(503);
    expect(await db.select().from(connections)).toEqual([]);
  });

  it("lets only the owner set or remove the key", async () => {
    session = session && { ...session, role: "member" };

    const put = await putCredential(API_KEY);
    const removed = await removeCredential();

    expect(put.status).toBe(403);
    expect(await put.json()).toEqual({ error: "owner-only" });
    expect(removed.status).toBe(403);
    expect(await db.select().from(connections)).toEqual([]);
  });

  it("keeps the Bank links when the key goes, and stops syncing", async () => {
    await putCredential(API_KEY);
    const linked = await realHandlers().putLink(
      request("links", {
        method: "PUT",
        body: { accountId: home.currentId, providerAccountId: "101" },
      }),
    );
    expect(linked.status).toBe(200);

    const removed = await removeCredential();
    const synced = await realHandlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );

    expect(removed.status).toBe(204);
    expect(JSON.parse((await listedAccounts()).text)).toEqual({
      status: "not_connected",
    });
    expect(synced.status).toBe(409);
    expect(await synced.json()).toEqual({ error: "not-connected" });
    expect(await db.select().from(bankLinks)).toMatchObject([
      { accountId: home.currentId, providerAccountId: "101", deletedAt: null },
    ]);

    await putCredential(API_KEY);
    const listed = JSON.parse((await listedAccounts()).text) as {
      accounts: { link: BankLinkView | null }[];
    };
    expect(listed.accounts[0].link?.accountId).toBe(home.currentId);
  });
});
