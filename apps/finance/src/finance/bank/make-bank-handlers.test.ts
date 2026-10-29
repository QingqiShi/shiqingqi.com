import { randomBytes, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { bankLinks, connections, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
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
import {
  providerAccount,
  providerRow,
  seedUncategorised,
} from "./testing/seed-bank-link.ts";
import type {
  BankConnection,
  BankLinkView,
  CredentialView,
  ProviderAccountsResponse,
  SyncNowResponse,
} from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c001";
const CREDENTIAL_KEY = new Uint8Array(randomBytes(32));

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let fixture: FakeBankFixture;
let connected: boolean;
let afterTasks: (() => Promise<void>)[];

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  await seedUncategorised(db, home);
  afterTasks = [];
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
    readOnly: false,
  };
  connected = true;
  fixture = {
    accounts: [
      providerAccount("p1"),
      providerAccount("p2", { status: "DISCONNECTED" }),
      providerAccount("usd", { currency: "USD" }),
    ],
    transactions: {
      p1: [providerRow("t1", "2026-10-08", -1000, "SHOP")],
    },
    balances: {
      p1: { amountMinor: -400, currency: "GBP" },
      p2: { amountMinor: 0, currency: "GBP" },
    },
  };
});

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
    afterResponse: (task) => {
      afterTasks.push(task);
    },
    now: () => NOW,
    ...overrides,
  });
}

function expense(id: string, date: string, entryId: string) {
  return {
    id: randomUUID(),
    name: "createTransaction" as const,
    args: {
      id,
      kind: "expense" as const,
      date,
      amountMinor: -1000,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      memberId: home.memberId,
      entries: [{ id: entryId, accountId: home.currentId, amountMinor: -1000 }],
    },
  };
}

function request(
  path: string,
  init: { method?: string; body?: unknown; origin?: string | null } = {},
) {
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  return new Request(`${ORIGIN}/api/bank/${path}`, {
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
      readOnly: false,
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

  it("stops each Rule on the account it links from posting automatically, and sends the change to each Replica", async () => {
    const rule = (
      id: string,
      entries: { accountId: string; amountMinor: number }[],
    ) => ({
      id: randomUUID(),
      name: "upsertRule" as const,
      args: {
        id,
        name: "Rent",
        unit: "month" as const,
        startsOn: "2026-11-01",
        autoPost: true,
        template: {
          kind:
            entries.length > 1 ? ("transfer" as const) : ("expense" as const),
          categoryId: entries.length > 1 ? null : home.groceriesId,
          entries,
        },
      },
    });
    const ruleIds = {
      current: randomUUID(),
      transfer: randomUUID(),
      savings: randomUUID(),
    };
    const pushed = await applyMutations(
      db,
      home.householdId,
      {
        clientId: CLIENT,
        mutations: [
          rule(ruleIds.current, [
            { accountId: home.currentId, amountMinor: -500 },
          ]),
          rule(ruleIds.transfer, [
            { accountId: home.savingsId, amountMinor: -500 },
            { accountId: home.currentId, amountMinor: 500 },
          ]),
          rule(ruleIds.savings, [
            { accountId: home.savingsId, amountMinor: -500 },
          ]),
        ],
      },
      NOW,
    );
    expect(pushed.rejected).toEqual([]);

    const autoPostPulledAfter = async (clock: number) => {
      const pulled = await pullChanges(db, home.householdId, clock);
      const rows = z
        .array(z.object({ id: z.string(), autoPost: z.boolean() }))
        .parse(pulled.tables.rules ?? []);
      return new Map(rows.map((row) => [row.id, row.autoPost]));
    };
    const { clock } = await pullChanges(db, home.householdId, 0);
    const link = (await (
      await putLink({ accountId: home.currentId, providerAccountId: "p1" })
    ).json()) as BankLinkView;
    expect(await autoPostPulledAfter(clock)).toEqual(
      new Map([
        [ruleIds.current, false],
        [ruleIds.transfer, false],
      ]),
    );

    await handlers().removeLink(
      request(`links?linkId=${link.id}`, { method: "DELETE" }),
    );
    const again = await applyMutations(
      db,
      home.householdId,
      {
        clientId: CLIENT,
        mutations: [
          {
            id: randomUUID(),
            name: "upsertRule",
            args: { id: ruleIds.current, autoPost: true },
          },
        ],
      },
      NOW,
    );
    expect(again.rejected).toEqual([]);
    const { clock: unlinkedClock } = await pullChanges(db, home.householdId, 0);
    await putLink({ accountId: home.currentId, providerAccountId: "p1" });
    expect(await autoPostPulledAfter(unlinkedClock)).toEqual(
      new Map([[ruleIds.current, false]]),
    );
  });

  it("syncs now, labels the new rows after the response, and lists the Entries no bank row backs", async () => {
    await putLink({ accountId: home.currentId, providerAccountId: "p1" });

    const response = await handlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );
    const result = (await response.json()) as SyncNowResponse;
    expect(result.links).toMatchObject([{ error: null, waiting: 1 }]);
    expect(result.clock).toBeGreaterThan(0);
    expect(await db.$count(transactions)).toBe(0);

    for (const task of afterTasks.splice(0)) await task();
    expect(await db.$count(transactions)).toBe(1);
    const [link] = await db.select().from(bankLinks);
    expect(link).toMatchObject({
      bankBalanceMinor: -400,
      bankRowsWaiting: false,
    });

    const duplicateEntryId = randomUUID();
    await applyMutations(
      db,
      home.householdId,
      {
        clientId: CLIENT,
        mutations: [
          expense(randomUUID(), "2026-10-08", duplicateEntryId),
          expense(randomUUID(), "2026-10-01", randomUUID()),
        ],
      },
      NOW,
    );

    const listed = await handlers().listUnbackedEntries(
      request(`unbacked-entries?linkId=${link.id}`),
    );
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual({ entryIds: [duplicateEntryId] });
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
  function realHandlers(credentialKey = CREDENTIAL_KEY) {
    const provider = makeBankProvider({
      fake: () => false,
      credentialKey: () => credentialKey,
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
      credentialKey: provider.credentialKey,
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
      accounts: [
        { providerAccountId: "101", bankLoginId: "7", name: "Everyday" },
      ],
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

  it("asks for the key again when the stored key no longer opens, and syncs once it is entered", async () => {
    await realHandlers(new Uint8Array(randomBytes(32))).putCredential(
      request("credential", { method: "PUT", body: { apiKey: API_KEY } }),
    );

    const listed = await listedAccounts();
    const synced = await realHandlers().syncNow(
      request("sync-now", { method: "POST", body: {} }),
    );

    expect(listed.status).toBe(200);
    expect(JSON.parse(listed.text)).toEqual({
      status: "not_connected",
      keyUnreadable: true,
    } satisfies ProviderAccountsResponse);
    expect(await synced.json()).toEqual({ error: "not-connected" });

    await putCredential(API_KEY);

    expect(JSON.parse((await listedAccounts()).text)).toMatchObject({
      status: "connected",
      credential: { lastFour: "wxyz" },
    });
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
