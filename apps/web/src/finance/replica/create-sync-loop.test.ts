import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { accounts, exchangeRates, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { balanceAt } from "../domain/balance/balance-at.ts";
import { makeExchangeRatesHandler } from "../exchange-rates/make-exchange-rates-handler.ts";
import { refreshHouseholdExchangeRates } from "../exchange-rates/refresh-exchange-rates.ts";
import {
  createFakeFrankfurter,
  type FakeFrankfurter,
} from "../exchange-rates/testing/create-fake-frankfurter.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { makeSyncHandlers } from "../sync/make-sync-handlers.ts";
import {
  REPLICA_ROW_SHAPE,
  ROW_SHAPE_HEADER,
} from "../sync/replica-row-shape.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { createSyncLoop, type SyncLoop } from "./create-sync-loop.ts";
import type { ReplicaPersistence, ReplicaRejection } from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const ENDPOINT = `${ORIGIN}/api/finance/sync`;
const EXCHANGE_RATES_ENDPOINT = `${ORIGIN}/api/finance/exchange-rates`;
const TODAY = "2026-10-10";

let exchangeRateRequests: string[] = [];
let exchangeRatesFail = false;
let exchangeRatesHang = false;
let loops: SyncLoop[] = [];
let frankfurter: FakeFrankfurter;
let afterPushWork: (() => Promise<unknown>)[] = [];

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;

beforeEach(async () => {
  exchangeRateRequests = [];
  exchangeRatesFail = false;
  exchangeRatesHang = false;
  loops = [];
  frankfurter = createFakeFrankfurter();
  afterPushWork = [];
  db = await createTestDb();
  home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
});

afterEach(async () => {
  for (const loop of loops) loop.stop();
  await db.close();
});

function routeToHandlers(
  serverRowShape: () => number,
  ratesRowShape: () => number,
) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const handlers = makeSyncHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getSession: () => Promise.resolve(session),
      now: () => new Date(`${TODAY}T12:00:00Z`),
      rowShape: serverRowShape(),
      afterPush: (householdId, effects) => {
        if (!effects.has("currency-changed")) return;
        afterPushWork.push(() =>
          refreshHouseholdExchangeRates(db, householdId, {
            fetch: (input, init) => frankfurter.fetch(input, init),
            now: () => new Date(`${TODAY}T12:00:00Z`),
          }),
        );
      },
    });
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    headers.set("Origin", ORIGIN);
    const request = new Request(url, { method, headers, body: init?.body });
    if (url.startsWith(EXCHANGE_RATES_ENDPOINT)) {
      exchangeRateRequests.push(url);
      if (exchangeRatesHang) return new Promise<Response>(() => undefined);
      return exchangeRatesFail
        ? new Response("", { status: 500 })
        : makeExchangeRatesHandler({
            isConfigured: () => true,
            getDb: () => db,
            getSession: () => Promise.resolve(session),
            rowShape: ratesRowShape(),
          })(request);
    }
    return method === "POST" ? handlers.POST(request) : handlers.GET(request);
  };
}

function createClient(
  options: {
    pushFails?: () => boolean;
    persistence?: ReplicaPersistence;
    serverRowShape?: () => number;
    ratesRowShape?: () => number;
    now?: () => number;
    onRequest?: (method: string, url: string) => void;
  } = {},
) {
  let online = true;
  const serverRowShape = options.serverRowShape ?? (() => REPLICA_ROW_SHAPE);
  const handlers = routeToHandlers(
    serverRowShape,
    options.ratesRowShape ?? serverRowShape,
  );
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
    fetch: (input, init) => {
      options.onRequest?.(
        init?.method ?? "GET",
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input,
      );
      return init?.method === "POST" && options.pushFails?.()
        ? Promise.resolve(new Response("", { status: 500 }))
        : handlers(input, init);
    },
    endpoint: ENDPOINT,
    exchangeRatesEndpoint: EXCHANGE_RATES_ENDPOINT,
    now: options.now,
    isOnline: () => online,
    isVisible: () => true,
    onUnauthorised: () => {
      unauthorised++;
    },
  });
  loops.push(loop);
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
      entries: [{ accountId: home.currentId, amountMinor: -1_000 }],
    });
    expect(local[1]).toMatchObject({
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

  it("downloads the whole history again on a device that kept only recent Transactions, and keeps its Outbox", async () => {
    const writer = createClient();
    await writer.ready();
    const old = createExpense(writer, 500, "2020-01-15");
    const recent = createExpense(writer, 700);
    await writer.loop.sync();

    const persistence = createMemoryPersistence();
    const device = createClient({ persistence });
    await device.ready();
    const queued = createExpense(device, 300);
    await device.store.flush();
    await persistence.write({
      meta: { ...device.store.getMeta(), rowShape: REPLICA_ROW_SHAPE - 1 },
      tables: { transactions: { put: [], delete: [old] } },
    });

    const reopened = createClient({ persistence });
    await reopened.ready();
    expect(reopened.store.getMeta()).toMatchObject({
      clientId: device.store.getMeta().clientId,
      bootstrapped: true,
      rowShape: REPLICA_ROW_SHAPE,
    });
    expect(reopened.snapshot().outboxCount).toBe(0);
    expect([...reopened.snapshot().tables.transactions.keys()].sort()).toEqual(
      [old, recent, queued].sort(),
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

  it("leaves the page alone when a sync from before a stop finds the session gone", async () => {
    const client = createClient();
    await client.ready();
    session = null;
    const syncing = client.loop.sync();
    client.loop.stop();
    await syncing;
    expect(client.unauthorisedCount()).toBe(0);
  });
});

async function storedTransaction(id: string) {
  const [row] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.id, id));
  return row;
}

describe("sync loop across a deploy", () => {
  it("keeps the Outbox and asks to reload when the server has a newer row shape", async () => {
    let serverRowShape = REPLICA_ROW_SHAPE;
    const client = createClient({ serverRowShape: () => serverRowShape });
    await client.ready();
    const id = createExpense(client, 900);
    await client.store.flush();
    serverRowShape = REPLICA_ROW_SHAPE + 1;

    await client.loop.sync();
    client.loop.stop();
    expect(client.loop.getStatus()).toMatchObject({
      problem: "outdated",
      newerRowShape: REPLICA_ROW_SHAPE + 1,
    });
    expect(client.rejections).toEqual([]);
    expect(client.snapshot().outboxCount).toBe(1);
    expect(await storedTransaction(id)).toBeUndefined();

    serverRowShape = REPLICA_ROW_SHAPE;
    await client.loop.sync();
    expect(client.snapshot().outboxCount).toBe(0);
    expect(await storedTransaction(id)).toBeDefined();
  });

  it("backs off without a reload, and applies no rows, when the server has an older row shape", async () => {
    let serverRowShape = REPLICA_ROW_SHAPE;
    const client = createClient({ serverRowShape: () => serverRowShape });
    await client.ready();
    const writer = createClient();
    await writer.ready();
    const written = createExpense(writer, 400);
    await writer.loop.sync();
    const queued = createExpense(client, 900);
    await client.store.flush();
    serverRowShape = REPLICA_ROW_SHAPE - 1;

    await client.loop.sync();
    client.loop.stop();
    expect(client.loop.getStatus()).toMatchObject({
      problem: "server-behind",
      failures: 1,
      newerRowShape: null,
    });
    expect(client.snapshot().tables.transactions.has(written)).toBe(false);
    expect(client.snapshot().outboxCount).toBe(1);
    expect(await storedTransaction(queued)).toBeUndefined();
  });

  it("drops an earlier push problem when the server turns out to have another row shape", async () => {
    let pushFails = false;
    let serverRowShape = REPLICA_ROW_SHAPE;
    const client = createClient({
      pushFails: () => pushFails,
      serverRowShape: () => serverRowShape,
    });
    await client.ready();
    createExpense(client, 900);
    pushFails = true;
    await client.loop.sync();
    expect(client.loop.getStatus()).toMatchObject({
      pushProblem: "server",
      pushFailures: 1,
    });

    pushFails = false;
    serverRowShape = REPLICA_ROW_SHAPE + 1;
    await client.loop.sync();
    client.loop.stop();
    expect(client.loop.getStatus()).toMatchObject({
      problem: "outdated",
      pushProblem: null,
      pushFailures: 0,
    });
  });

  it("stops for good, and shows that it is outdated, when a tab with a newer row shape opens", async () => {
    const client = createClient();
    await client.ready();
    const id = createExpense(client, 900);
    const leaderStatus = client.loop.getStatus();

    client.loop.stopForNewerTab(REPLICA_ROW_SHAPE + 1);
    await client.loop.sync();
    client.loop.followStatus(leaderStatus);
    expect(client.loop.getStatus()).toMatchObject({
      problem: "outdated",
      newerRowShape: REPLICA_ROW_SHAPE + 1,
    });
    expect(client.snapshot().outboxCount).toBe(1);
    expect(await storedTransaction(id)).toBeUndefined();
  });

  it("keeps a mutation in the Outbox while the schema lacks a column the server code writes, and sends it once they match", async () => {
    const client = createClient();
    await client.ready();
    await db.execute(sql`ALTER TABLE transactions RENAME COLUMN note TO memo`);
    const id = createExpense(client, 900);
    await client.store.flush();

    await client.loop.sync();
    client.loop.stop();
    expect(client.rejections).toEqual([]);
    expect(client.loop.getStatus().pushProblem).toBe("server");
    expect(client.snapshot().outboxCount).toBe(1);

    await db.execute(sql`ALTER TABLE transactions RENAME COLUMN memo TO note`);
    await client.loop.sync();
    expect(client.rejections).toEqual([]);
    expect(client.snapshot().outboxCount).toBe(0);
    expect(await storedTransaction(id)).toBeDefined();
  });

  it("rejects a mutation the database refuses for good with a class 42 code, and sends the rest of the batch", async () => {
    const client = createClient();
    await client.ready();
    await db.execute(sql`
      CREATE FUNCTION refuse_transaction() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
      END;
      $$ LANGUAGE plpgsql
    `);
    await db.execute(sql`
      CREATE TRIGGER refuse_transaction BEFORE INSERT ON entries
      FOR EACH ROW WHEN (NEW.amount_minor = -666)
      EXECUTE FUNCTION refuse_transaction()
    `);
    const refused = createExpense(client, 666);
    const fine = createExpense(client, 900);
    await client.store.flush();

    await client.loop.sync();
    client.loop.stop();
    expect(
      client.rejections.map((rejection) => ({
        id:
          rejection.mutation.name === "createTransaction"
            ? rejection.mutation.args.id
            : null,
        reason: rejection.reason,
      })),
    ).toEqual([{ id: refused, reason: "invalid" }]);
    expect(client.snapshot().outboxCount).toBe(0);
    expect(await storedTransaction(refused)).toBeUndefined();
    expect(await storedTransaction(fine)).toBeDefined();
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

  it("polls no more while the server has a newer row shape, and tries again on focus", async () => {
    vi.useFakeTimers();
    try {
      const client = failingClient(
        () =>
          new Response(JSON.stringify({ error: "row-shape" }), {
            status: 426,
            headers: { [ROW_SHAPE_HEADER]: String(REPLICA_ROW_SHAPE + 1) },
          }),
      );
      await client.store.load();
      client.loop.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(client.loop.getStatus().problem).toBe("outdated");
      expect(client.calls()).toBe(1);

      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(client.calls()).toBe(1);

      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(0);
      expect(client.calls()).toBe(2);
      client.loop.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("exchange rates", () => {
  async function moveSavingsToUsd() {
    await db
      .update(accounts)
      .set({ currency: "USD" })
      .where(eq(accounts.id, home.savingsId));
  }

  it("downloads the rates on the first run, then only the new ones, and keeps them on disk", async () => {
    await moveSavingsToUsd();
    await db.insert(exchangeRates).values([
      {
        base: "USD",
        quote: "GBP",
        on: "2026-10-08",
        rate: 0.75,
        source: "household",
      },
      { base: "CNY", quote: "GBP", on: "2026-10-08", rate: 0.1, source: "ecb" },
    ]);
    let time = 0;
    const persistence = createMemoryPersistence();
    const client = createClient({ persistence, now: () => time });
    await client.ready();
    expect([...client.snapshot().exchangeRates.values()]).toEqual([
      {
        base: "USD",
        quote: "GBP",
        on: "2026-10-08",
        rate: 0.75,
        source: "household",
      },
    ]);
    expect(exchangeRateRequests).toEqual([EXCHANGE_RATES_ENDPOINT]);

    await db.insert(exchangeRates).values({
      base: "USD",
      quote: "GBP",
      on: "2026-10-09",
      rate: 0.76,
      source: "ecb",
    });
    time = 60_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(1);

    time = 15 * 60_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(2);
    expect(exchangeRateRequests[1]).toContain("?since=");
    expect(
      [...client.snapshot().exchangeRates.values()].map((rate) => rate.on),
    ).toEqual(["2026-10-08", "2026-10-09"]);

    const reloaded = createClient({ persistence, now: () => time });
    await reloaded.store.load();
    expect(reloaded.snapshot().exchangeRates.size).toBe(2);
    expect(reloaded.store.getMeta().exchangeRateCursor).toBe(
      client.store.getMeta().exchangeRateCursor,
    );
  });

  it("has the rates on a new device before its bootstrap finishes", async () => {
    await moveSavingsToUsd();
    await db.insert(exchangeRates).values({
      base: "USD",
      quote: "GBP",
      on: "2026-10-08",
      rate: 0.75,
      source: "ecb",
    });
    const client = createClient({ now: () => 0 });
    let ratesWhenBootstrapped: number | null = null;
    client.store.subscribe(() => {
      const snapshot = client.snapshot();
      if (snapshot.bootstrapped && ratesWhenBootstrapped === null) {
        ratesWhenBootstrapped = snapshot.exchangeRates.size;
      }
    });

    await client.ready();

    expect(ratesWhenBootstrapped).toBe(1);
    expect(exchangeRateRequests).toHaveLength(1);
  });

  it("tries again soon while a pair has no rate, doubling the wait, then waits 15 minutes", async () => {
    await moveSavingsToUsd();
    let time = 0;
    const client = createClient({ now: () => time });
    await client.ready();
    expect(exchangeRateRequests).toHaveLength(1);

    for (const [at, requests] of [
      [29_000, 1],
      [30_000, 2],
      [89_000, 2],
    ] as const) {
      time = at;
      await client.loop.sync();
      expect(exchangeRateRequests, String(at)).toHaveLength(requests);
    }

    await db.insert(exchangeRates).values({
      base: "GBP",
      quote: "USD",
      on: "2026-10-09",
      rate: 1.3,
      source: "ecb",
    });
    time = 90_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(3);
    expect(client.snapshot().exchangeRates.size).toBe(1);

    time = 90_000 + 15 * 60_000 - 1;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(3);
    time = 90_000 + 15 * 60_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(4);
  });

  it("does not try again for a currency the ECB does not publish", async () => {
    await db
      .update(accounts)
      .set({ currency: "AED" })
      .where(eq(accounts.id, home.savingsId));
    let time = 0;
    const client = createClient({ now: () => time });
    await client.ready();

    time = 15 * 60_000 - 1;
    await client.loop.sync();

    expect(exchangeRateRequests).toHaveLength(1);
  });

  it("downloads at once when the Household starts to use another currency, then again once the server has its rates", async () => {
    frankfurter.rates.set("USD/GBP", 0.75);
    let time = 0;
    const client = createClient({ now: () => time });
    await client.ready();
    expect(client.snapshot().exchangeRates.size).toBe(0);

    client.store.applyLocal({
      name: "upsertAccount",
      args: { id: home.savingsId, currency: "USD" },
    });
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(2);
    expect(client.snapshot().exchangeRates.size).toBe(0);

    expect(afterPushWork).toHaveLength(1);
    for (const work of afterPushWork) await work();
    time = 29_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(2);
    time = 30_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(3);
    expect([...client.snapshot().exchangeRates.values()]).toContainEqual(
      expect.objectContaining({ base: "USD", quote: "GBP", rate: 0.75 }),
    );

    time = 31_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(3);
  });

  it("pushes a change made during the pull before it downloads rates", async () => {
    const calls: string[] = [];
    let duringPull: (() => void) | undefined;
    let time = 0;
    const client = createClient({
      now: () => time,
      onRequest: (method, url) => {
        const kind = url.startsWith(EXCHANGE_RATES_ENDPOINT)
          ? "rates"
          : method === "POST"
            ? "push"
            : "pull";
        calls.push(kind);
        if (kind === "pull") duringPull?.();
        duringPull = undefined;
      },
    });
    await client.ready();
    calls.length = 0;
    duringPull = () => createExpense(client, 100);
    time = 15 * 60_000;

    await client.loop.sync();

    expect(calls).toEqual(["pull", "push", "rates"]);
    expect(client.snapshot().outboxCount).toBe(0);
  });

  it("does not download for a new account in the Base currency", async () => {
    const client = createClient({ now: () => 0 });
    await client.ready();

    client.store.applyLocal({
      name: "upsertAccount",
      args: {
        id: randomUUID(),
        groupId: home.liquidGroupId,
        name: "Pounds",
        kind: "cash",
        currency: "GBP",
      },
    });
    await client.loop.sync();

    expect(exchangeRateRequests).toHaveLength(1);
  });

  it("tries a failed download again after 30 s, doubling the wait, and not before", async () => {
    let time = 0;
    const client = createClient({ now: () => time });
    await client.ready();
    exchangeRatesFail = true;
    const start = 15 * 60_000;
    time = start;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(2);

    for (const [after, requests] of [
      [29_000, 2],
      [30_000, 3],
      [89_000, 3],
      [90_000, 4],
    ] as const) {
      time = start + after;
      await client.loop.sync();
      expect(exchangeRateRequests, String(after)).toHaveLength(requests);
    }

    exchangeRatesFail = false;
    time = start + 210_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(5);
    time = start + 211_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(5);
  });

  describe("on a new device", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    async function untilRatesRequested(count: number) {
      while (exchangeRateRequests.length < count) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    it("finishes the bootstrap when the first download fails, and tries again after 2 s, doubling, without waiting for a run", async () => {
      await moveSavingsToUsd();
      await db.insert(exchangeRates).values({
        base: "USD",
        quote: "GBP",
        on: "2026-10-08",
        rate: 0.75,
        source: "ecb",
      });
      exchangeRatesFail = true;
      const client = createClient({ now: () => Date.now() });
      await client.ready();
      expect(client.snapshot().bootstrapped).toBe(true);
      expect(client.snapshot().exchangeRates.size).toBe(0);
      expect(exchangeRateRequests).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(2_000);
      await untilRatesRequested(2);
      await client.loop.sync();
      exchangeRatesFail = false;
      await vi.advanceTimersByTimeAsync(3_999);
      expect(exchangeRateRequests).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(1);
      await untilRatesRequested(3);
      await client.loop.sync();
      expect(client.snapshot().exchangeRates.size).toBe(1);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(exchangeRateRequests).toHaveLength(3);
    });

    it("finishes the bootstrap after 5 s when the first download does not answer", async () => {
      exchangeRatesHang = true;
      const client = createClient({ now: () => Date.now() });
      await client.store.load();
      const synced = client.loop.sync();
      await untilRatesRequested(1);
      await vi.advanceTimersByTimeAsync(4_999);
      expect(client.snapshot().bootstrapped).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await synced;
      expect(client.snapshot().bootstrapped).toBe(true);
      expect(client.loop.getStatus().problem).toBeNull();

      exchangeRatesHang = false;
      await vi.advanceTimersByTimeAsync(2_000);
      await untilRatesRequested(2);
    });
  });

  it.each([
    [
      "asks to reload",
      "a newer",
      REPLICA_ROW_SHAPE + 1,
      { problem: "outdated", newerRowShape: REPLICA_ROW_SHAPE + 1 },
    ],
    [
      "backs off without a reload",
      "an older",
      REPLICA_ROW_SHAPE - 1,
      { problem: "server-behind", failures: 1, newerRowShape: null },
    ],
  ])(
    "%s, and keeps the rates on the device, when the rates download meets %s row shape",
    async (_, __, ratesShape, expected) => {
      await moveSavingsToUsd();
      await db.insert(exchangeRates).values({
        base: "USD",
        quote: "GBP",
        on: "2026-10-08",
        rate: 0.75,
        source: "ecb",
      });
      let time = 0;
      let ratesRowShape = REPLICA_ROW_SHAPE;
      const client = createClient({
        now: () => time,
        ratesRowShape: () => ratesRowShape,
      });
      await client.ready();
      ratesRowShape = ratesShape;
      time = 15 * 60_000;

      await client.loop.sync();
      client.loop.stop();

      expect(exchangeRateRequests).toHaveLength(2);
      expect(client.loop.getStatus()).toMatchObject(expected);
      expect(client.snapshot().exchangeRates.size).toBe(1);
    },
  );

  it("keeps the rates on the device when the download fails", async () => {
    await moveSavingsToUsd();
    await db.insert(exchangeRates).values({
      base: "USD",
      quote: "GBP",
      on: "2026-10-08",
      rate: 0.75,
      source: "ecb",
    });
    let time = 0;
    const client = createClient({ now: () => time });
    await client.ready();
    exchangeRatesFail = true;
    time = 15 * 60_000;
    await client.loop.sync();
    expect(exchangeRateRequests).toHaveLength(2);
    expect(client.snapshot().exchangeRates.size).toBe(1);
    expect(client.loop.getStatus().problem).toBeNull();
  });
});
