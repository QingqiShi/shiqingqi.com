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
