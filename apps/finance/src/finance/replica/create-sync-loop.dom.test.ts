import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { transactions } from "../db/schema.ts";
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
import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { createSyncLoop, type SyncLoop } from "./create-sync-loop.ts";
import type { ReplicaPersistence, ReplicaRejection } from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const ENDPOINT = `${ORIGIN}/api/sync`;
const EXCHANGE_RATES_ENDPOINT = `${ORIGIN}/api/exchange-rates`;
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
    readOnly: false,
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

describe("sync loop against the real handlers", () => {
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
});
