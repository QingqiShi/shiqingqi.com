import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { balanceAt } from "../domain/balance/balance-at.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { makeSyncHandlers } from "../sync/make-sync-handlers.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import {
  createReplicaStore,
  REPLICA_ROW_SHAPE,
} from "./create-replica-store.ts";
import { createSyncLoop } from "./create-sync-loop.ts";
import type { ReplicaPersistence, ReplicaRejection } from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const ENDPOINT = `${ORIGIN}/api/finance/sync`;
const DB_HOOK_TIMEOUT = 60_000;
const TODAY = "2026-10-10";

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function routeToHandlers() {
  const handlers = makeSyncHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date(`${TODAY}T12:00:00Z`),
  });
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? "GET";
    const request = new Request(url, {
      method,
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: init?.body,
    });
    return method === "POST" ? handlers.POST(request) : handlers.GET(request);
  };
}

function createClient(
  options: {
    pushFails?: () => boolean;
    persistence?: ReplicaPersistence;
  } = {},
) {
  let online = true;
  const handlers = routeToHandlers();
  const rejections: ReplicaRejection[] = [];
  let unauthorised = 0;
  const store = createReplicaStore({
    householdId: home.householdId,
    persistence: options.persistence ?? createMemoryPersistence(),
    now: () => new Date(`${TODAY}T09:00:00Z`),
  });
  store.onRejection((rejection) => {
    rejections.push(rejection);
  });
  const loop = createSyncLoop({
    store,
    fetch: (input, init) =>
      init?.method === "POST" && options.pushFails?.()
        ? Promise.resolve(new Response("", { status: 500 }))
        : handlers(input, init),
    endpoint: ENDPOINT,
    isOnline: () => online,
    isVisible: () => true,
    onUnauthorised: () => {
      unauthorised++;
    },
  });
  return {
    store,
    loop,
    rejections,
    unauthorisedCount: () => unauthorised,
    setOnline(value: boolean) {
      online = value;
    },
    snapshot: () => store.getSnapshot(),
    async ready() {
      await store.load();
      await loop.sync();
    },
  };
}

function createExpense(
  client: ReturnType<typeof createClient>,
  amount: number,
  date = "2026-10-09",
) {
  const id = randomUUID();
  client.store.applyLocal({
    name: "createTransaction",
    args: {
      id,
      kind: "expense",
      date,
      amountMinor: -amount,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      entries: [
        { id: randomUUID(), accountId: home.currentId, amountMinor: -amount },
      ],
      tagIds: [],
    },
  });
  return id;
}

function currentBalance(client: ReturnType<typeof createClient>) {
  const series = selectBalanceSeriesByAccount(client.snapshot()).get(
    home.currentId,
  );
  return series ? balanceAt(series, TODAY) : 0;
}

/** A Rule's Transactions with their live Entries, in date order. */
function rowsOfRule(client: ReturnType<typeof createClient>, ruleId: string) {
  const { tables } = client.snapshot();
  return [...tables.transactions.values()]
    .filter((row) => row.ruleId === ruleId)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((row) => ({
      id: row.id,
      date: row.date,
      status: row.status,
      amountMinor: row.amountMinor,
      categoryId: row.categoryId,
      payeeId: row.payeeId,
      memberId: row.memberId,
      labelledBy: row.labelledBy,
      searchText: row.searchText,
      deleted: row.deletedAt !== null,
      entries: [...tables.entries.values()]
        .filter(
          (entry) => entry.transactionId === row.id && entry.deletedAt === null,
        )
        .sort((a, b) => a.position - b.position)
        .map((entry) => ({
          id: entry.id,
          accountId: entry.accountId,
          amountMinor: entry.amountMinor,
          fxRate: entry.fxRate,
          date: entry.date,
        })),
    }));
}

describe("sync loop against the real handlers", () => {
  it("bootstraps the household", async () => {
    const client = createClient();
    await client.ready();
    const snapshot = client.snapshot();
    expect(snapshot.bootstrapped).toBe(true);
    expect(snapshot.household?.id).toBe(home.householdId);
    expect(snapshot.tables.accounts.size).toBe(3);
    expect(snapshot.tables.members.get(home.partnerId)?.name).toBe("Partner");
    expect(client.loop.getStatus().problem).toBeNull();
  });

  it("keeps an offline mutation, pushes it on reconnect, and confirms it on pull", async () => {
    const client = createClient();
    await client.ready();

    client.setOnline(false);
    const id = createExpense(client, 1_250);
    expect(client.snapshot().tables.transactions.get(id)?.searchText).toBe(
      "grocer groceries",
    );
    expect(client.snapshot().pendingKeys.has(`transactions:${id}`)).toBe(true);
    expect(currentBalance(client)).toBe(-1_250);

    await client.loop.sync();
    expect(client.loop.getStatus().problem).toBe("offline");
    expect(client.snapshot().outboxCount).toBe(1);

    client.setOnline(true);
    await client.loop.sync();
    const snapshot = client.snapshot();
    expect(snapshot.outboxCount).toBe(0);
    expect(snapshot.pendingKeys.size).toBe(0);
    expect(snapshot.pendingAccounts.size).toBe(0);
    expect(snapshot.tables.transactions.get(id)?.version).toBeGreaterThan(0);
    expect(currentBalance(client)).toBe(-1_250);
    expect(selectTransactionsByDateDesc(snapshot).map((row) => row.id)).toEqual(
      [id],
    );
  });

  it("lets two clients edit different fields of one transaction", async () => {
    const first = createClient();
    const second = createClient();
    await first.ready();
    await second.ready();
    const id = createExpense(first, 1_000);
    await first.loop.sync();
    await second.loop.sync();
    const entryId = [...second.snapshot().tables.entries.values()].find(
      (entry) => entry.transactionId === id,
    )?.id;
    expect(entryId).toBeDefined();

    first.store.applyLocal({
      name: "updateTransaction",
      args: { id, patch: { note: "Weekly shop" } },
    });
    second.store.applyLocal({
      name: "updateTransaction",
      args: {
        id,
        patch: {
          amountMinor: -1_500,
          entries: [
            {
              id: entryId ?? "",
              accountId: home.currentId,
              amountMinor: -1_500,
            },
          ],
        },
      },
    });
    expect(currentBalance(second)).toBe(-1_500);
    await first.loop.sync();
    await second.loop.sync();
    await first.loop.sync();

    for (const client of [first, second]) {
      const row = client.snapshot().tables.transactions.get(id);
      expect(row?.note).toBe("Weekly shop");
      expect(row?.amountMinor).toBe(-1_500);
      expect(currentBalance(client)).toBe(-1_500);
      expect(client.snapshot().pendingKeys.size).toBe(0);
    }
  });

  it("reports an update to a transaction another client deleted", async () => {
    const first = createClient();
    const second = createClient();
    await first.ready();
    await second.ready();
    const id = createExpense(first, 800);
    await first.loop.sync();
    await second.loop.sync();

    first.store.applyLocal({ name: "deleteTransaction", args: { id } });
    await first.loop.sync();
    second.store.applyLocal({
      name: "updateTransaction",
      args: { id, patch: { note: "Too late" } },
    });
    await second.loop.sync();

    expect(second.rejections).toEqual([
      expect.objectContaining({ reason: "deleted" }),
    ]);
    const snapshot = second.snapshot();
    expect(snapshot.tables.transactions.get(id)?.deletedAt).not.toBeNull();
    expect(selectTransactionsByDateDesc(snapshot)).toEqual([]);
    expect(snapshot.outboxCount).toBe(0);
    expect(currentBalance(second)).toBe(0);
  });

  it("moves a Rule's Expected transactions offline the way the server does", async () => {
    const client = createClient();
    await client.ready();
    const ruleId = randomUUID();
    const diningId = randomUUID();
    client.store.applyLocal({
      name: "upsertCategory",
      args: { id: diningId, kind: "expense", name: "Dining" },
    });
    client.store.applyLocal({
      name: "upsertRule",
      args: {
        id: ruleId,
        name: "Weekly shop",
        unit: "week",
        startsOn: "2026-10-08",
        template: {
          kind: "expense",
          amountMinor: -1_000,
          categoryId: home.groceriesId,
          payeeId: home.grocerId,
          entries: [{ accountId: home.currentId, amountMinor: -1_000 }],
        },
      },
    });
    await client.loop.sync();
    const ruleRows = () => rowsOfRule(client, ruleId);
    expect(ruleRows().map((row) => row.date)).toEqual([
      "2026-10-08",
      "2026-10-15",
    ]);

    expect(() =>
      client.store.applyLocal({
        name: "upsertRule",
        args: {
          id: ruleId,
          template: {
            kind: "transfer",
            amountMinor: 0,
            entries: [
              { accountId: home.currentId, amountMinor: -1_000 },
              { accountId: home.cardId, amountMinor: 1_000 },
            ],
          },
        },
      }),
    ).toThrow(/keeps its kind/);

    client.setOnline(false);
    client.store.applyLocal({
      name: "upsertRule",
      args: {
        id: ruleId,
        template: {
          kind: "expense",
          amountMinor: -2_500,
          categoryId: diningId,
          payeeId: home.employerId,
          entries: [{ accountId: home.cardId, amountMinor: -2_500 }],
        },
      },
    });
    const local = ruleRows();
    client.setOnline(true);
    await client.loop.sync();

    expect(client.snapshot().outboxCount).toBe(0);
    expect(ruleRows()).toEqual(local);
    expect(local[0]).toMatchObject({
      amountMinor: -1_000,
      entries: [{ accountId: home.currentId, amountMinor: -1_000 }],
    });
    expect(local[1]).toMatchObject({
      amountMinor: -2_500,
      categoryId: diningId,
      payeeId: home.employerId,
      searchText: "employer dining",
      entries: [{ accountId: home.cardId, amountMinor: -2_500 }],
    });
  });

  it("gives an occurrence that a schedule change restores offline the new template, as the server does", async () => {
    const client = createClient();
    await client.ready();
    const ruleId = randomUUID();
    client.store.applyLocal({
      name: "upsertRule",
      args: {
        id: ruleId,
        name: "Weekly shop",
        unit: "week",
        weekday: 4,
        startsOn: "2026-10-08",
        template: {
          kind: "expense",
          amountMinor: -1_000,
          categoryId: home.groceriesId,
          payeeId: home.grocerId,
          entries: [{ accountId: home.currentId, amountMinor: -1_000 }],
        },
      },
    });
    await client.loop.sync();
    const live = () => rowsOfRule(client, ruleId).filter((row) => !row.deleted);
    expect(live().map((row) => row.date)).toEqual(["2026-10-08", "2026-10-15"]);

    client.setOnline(false);
    client.store.applyLocal({
      name: "upsertRule",
      args: { id: ruleId, weekday: 5 },
    });
    client.store.applyLocal({
      name: "upsertRule",
      args: {
        id: ruleId,
        weekday: 4,
        template: {
          kind: "expense",
          amountMinor: -2_500,
          categoryId: home.groceriesId,
          payeeId: home.grocerId,
          memberId: home.partnerId,
          entries: [{ accountId: home.cardId, amountMinor: -2_500 }],
        },
      },
    });
    const local = live();
    client.setOnline(true);
    await client.loop.sync();

    expect(client.snapshot().outboxCount).toBe(0);
    expect(local[1]).toMatchObject({
      date: "2026-10-15",
      amountMinor: -2_500,
      memberId: home.partnerId,
      entries: [{ accountId: home.cardId, amountMinor: -2_500 }],
    });
    expect(live()).toEqual(local);
  });

  it("bootstraps again when the server clock is behind the replica", async () => {
    const client = createClient();
    await client.ready();
    const { household } = client.snapshot();
    if (!household) throw new Error("No household");
    const clock = client.store.getMeta().clock;
    client.store.applyPull(
      { clock: clock + 50, household, tables: {} },
      new Set(),
    );

    await client.loop.sync();
    expect(client.store.getMeta().clock).toBe(clock);
    expect(client.snapshot().bootstrapped).toBe(true);
    expect(client.snapshot().tables.accounts.size).toBe(3);
  });

  it("downloads the whole history again on a device that kept only recent Transactions", async () => {
    const writer = createClient();
    await writer.ready();
    const old = createExpense(writer, 500, "2020-01-15");
    const recent = createExpense(writer, 700);
    await writer.loop.sync();

    const persistence = createMemoryPersistence();
    const device = createClient({ persistence });
    await device.ready();
    await persistence.write({
      meta: { ...device.store.getMeta(), rowShape: REPLICA_ROW_SHAPE - 1 },
      tables: { transactions: { put: [], delete: [old] } },
    });

    const reopened = createClient({ persistence });
    await reopened.ready();
    expect(reopened.store.getMeta()).toMatchObject({
      bootstrapped: true,
      rowShape: REPLICA_ROW_SHAPE,
    });
    expect([...reopened.snapshot().tables.transactions.keys()].sort()).toEqual(
      [old, recent].sort(),
    );
  });

  it("downloads the household although the push fails", async () => {
    let pushFails = false;
    const client = createClient({ pushFails: () => pushFails });
    await client.ready();
    pushFails = true;
    const id = createExpense(client, 900);
    client.store.requireBootstrap();

    await client.loop.sync();
    client.loop.stop();
    expect(client.store.getMeta().bootstrapped).toBe(true);
    expect(client.snapshot().tables.accounts.size).toBe(3);
    expect(client.snapshot().outboxCount).toBe(1);
    expect(client.snapshot().tables.transactions.get(id)).toBeDefined();
    expect(client.loop.getStatus()).toMatchObject({
      problem: null,
      failures: 0,
      pushProblem: "server",
      pushFailures: 1,
    });

    pushFails = false;
    await client.loop.retryNow();
    client.loop.stop();
    expect(client.snapshot().outboxCount).toBe(0);
    expect(client.loop.getStatus()).toMatchObject({
      problem: null,
      pushProblem: null,
      pushFailures: 0,
    });
    expect(
      client.snapshot().tables.transactions.get(id)?.version,
    ).toBeGreaterThan(0);
  });

  it("sends the visitor to sign-in when the session is gone", async () => {
    const client = createClient();
    await client.ready();
    session = null;
    await client.loop.sync();
    expect(client.unauthorisedCount()).toBe(1);
    expect(client.loop.getStatus().problem).toBe("unauthorised");
  });
});

describe("sync loop when the server fails", () => {
  function failingClient(response: () => Response) {
    let calls = 0;
    const store = createReplicaStore({
      householdId: randomUUID(),
      persistence: createMemoryPersistence(),
    });
    const loop = createSyncLoop({
      store,
      fetch: () => {
        calls++;
        return Promise.resolve(response());
      },
      endpoint: ENDPOINT,
      isOnline: () => true,
      isVisible: () => true,
    });
    return { store, loop, calls: () => calls };
  }

  it("counts failed runs in a row, so the screen can stop waiting", async () => {
    const client = failingClient(() => new Response("", { status: 500 }));
    await client.store.load();
    await client.loop.sync();
    expect(client.loop.getStatus()).toMatchObject({
      problem: "server",
      failures: 1,
    });
    await client.loop.retryNow();
    expect(client.loop.getStatus().failures).toBe(2);
    expect(client.store.getSnapshot().bootstrapped).toBe(false);
    client.loop.stop();
  });

  it("waits as long as a 429 asks before it tries again", async () => {
    vi.useFakeTimers();
    try {
      const client = failingClient(
        () =>
          new Response(JSON.stringify({ error: "too-many-requests" }), {
            status: 429,
            headers: { "Retry-After": "120" },
          }),
      );
      await client.store.load();
      await client.loop.sync();
      expect(client.loop.getStatus().problem).toBe("busy");
      expect(client.calls()).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(client.calls()).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(client.calls()).toBe(2);
      client.loop.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
