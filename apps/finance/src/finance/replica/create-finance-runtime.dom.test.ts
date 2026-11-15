import { randomUUID } from "node:crypto";
import { locks } from "node:worker_threads";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { makeSyncHandlers } from "../sync/make-sync-handlers.ts";
import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import { createFinanceRuntime } from "./create-finance-runtime.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import type { SyncProblem } from "./types.ts";

const OLD = REPLICA_ROW_SHAPE;
const NEW = REPLICA_ROW_SHAPE + 1;

let householdId: string;
const runtimes: ReturnType<typeof createFinanceRuntime>[] = [];

beforeAll(() => {
  Object.defineProperty(navigator, "locks", {
    value: locks,
    configurable: true,
  });
});

afterAll(() => {
  Reflect.deleteProperty(navigator, "locks");
});

beforeEach(() => {
  householdId = randomUUID();
});

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.close();
  sessionStorage.clear();
  Reflect.deleteProperty(document, "visibilityState");
});

/** The real sync handlers, with a database that is gone: only a request of another row shape gets past them, as a 426. */
function serverWithRowShape(rowShape: number) {
  const session: FinanceSession = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId,
    memberId: randomUUID(),
    role: "owner",
    readOnly: false,
  };
  const handlers = makeSyncHandlers({
    isConfigured: () => true,
    getDb: () => {
      throw new Error("No database in this test");
    },
    getSession: () => Promise.resolve(session),
    now: () => new Date(),
    rowShape,
  });
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const request = new Request(new URL(url, "https://qingqi.dev"), {
      ...init,
      headers: { ...Object.fromEntries(new Headers(init?.headers)) },
    });
    return request.method === "POST"
      ? handlers.POST(request)
      : handlers.GET(request);
  };
}

async function openTab(rowShape: number, serverRowShape: number) {
  let reloads = 0;
  let requests = 0;
  const server = serverWithRowShape(serverRowShape);
  const problems: (SyncProblem | null)[] = [];
  const runtime = createFinanceRuntime({
    householdId,
    onUnauthorised: () => undefined,
    persistence: createMemoryPersistence(),
    fetch: (input, init) => {
      requests++;
      return server(input, init);
    },
    rowShape,
    reload: (confirm) => {
      if (confirm && !confirm()) return Promise.resolve(false);
      reloads++;
      return Promise.resolve(true);
    },
  });
  runtimes.push(runtime);
  runtime.loop.subscribeStatus(() => {
    problems.push(runtime.loop.getStatus().problem);
  });
  await runtime.start();
  return {
    runtime,
    status: () => runtime.loop.getStatus(),
    problems,
    reloads: () => reloads,
    requests: () => requests,
  };
}

describe("tabs that run code of different row shapes", () => {
  // In most tests the server has the older row shape, as after a rollback.
  // Thus only the newer tab can make the older tab outdated.
  it("lets a newer tab take the lead from an older leader, which stops syncing and shows Reload", async () => {
    const older = await openTab(OLD, OLD);
    await vi.waitFor(() => {
      expect(older.status()).toMatchObject({ leader: true });
    });

    const newer = await openTab(NEW, OLD);
    await vi.waitFor(() => {
      expect(newer.status().leader).toBe(true);
    });
    expect(older.status()).toMatchObject({
      leader: false,
      problem: "outdated",
      newerRowShape: NEW,
    });
    expect(newer.problems).not.toContain("outdated");
  });

  it("never lets an older tab that opens next to a newer leader lead, and shows it Reload", async () => {
    const newer = await openTab(NEW, OLD);
    await vi.waitFor(() => {
      expect(newer.status().leader).toBe(true);
    });

    const older = await openTab(OLD, OLD);
    await vi.waitFor(() => {
      expect(older.status()).toMatchObject({
        problem: "outdated",
        newerRowShape: NEW,
      });
    });
    expect(older.requests()).toBe(0);
    expect(older.status().leader).toBe(false);
    expect(newer.status().leader).toBe(true);
  });
});

describe("a tab that opens beside the tab that syncs", () => {
  let db: TestDb;

  afterEach(async () => {
    await db.close();
  });

  // The second tab showed "Not synced yet" until the first tab synced again,
  // which a hidden first tab never did.
  it("shows the last sync of the leader without waiting for the next one", async () => {
    db = await createTestDb();
    const home = await seedTestHousehold(db);
    householdId = home.householdId;
    const session: FinanceSession = {
      sessionId: randomUUID(),
      userId: randomUUID(),
      householdId,
      memberId: home.memberId,
      role: "owner",
      readOnly: false,
    };
    const handlers = makeSyncHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getSession: () => Promise.resolve(session),
      now: () => new Date(),
      rowShape: REPLICA_ROW_SHAPE,
    });
    const persistence = createMemoryPersistence();
    const openSyncedTab = async () => {
      const runtime = createFinanceRuntime({
        householdId,
        onUnauthorised: () => undefined,
        persistence,
        fetch: (input, init) => {
          const url = new URL(
            input instanceof Request ? input.url : input,
            "https://qingqi.dev",
          );
          if (url.pathname !== "/api/sync") {
            return Promise.resolve(new Response("", { status: 500 }));
          }
          const headers = new Headers(init?.headers);
          headers.set("Origin", url.origin);
          const request = new Request(url, { ...init, headers });
          return request.method === "POST"
            ? handlers.POST(request)
            : handlers.GET(request);
        },
      });
      runtimes.push(runtime);
      await runtime.start();
      return runtime;
    };

    const first = await openSyncedTab();
    await vi.waitFor(() => {
      expect(first.loop.getStatus().lastSyncedAt).not.toBeNull();
    });
    await first.store.flush();

    const second = await openSyncedTab();

    await vi.waitFor(() => {
      expect(second.loop.getStatus()).toMatchObject({
        leader: false,
        lastSyncedAt: first.loop.getStatus().lastSyncedAt,
      });
    });
  });
});
