import {
  readRowShape,
  REPLICA_ROW_SHAPE,
  ROW_SHAPE_HEADER,
  ROW_SHAPE_MISMATCH_STATUS,
} from "../sync/replica-row-shape.ts";
import type {
  BootstrapLine,
  PullResponse,
  PushResponse,
} from "../sync/types.ts";
import type { ReplicaStore } from "./create-replica-store.ts";
import { readNdjsonLines } from "./read-ndjson-lines.ts";
import type { SyncProblem, SyncStatus } from "./types.ts";

const SYNC_ENDPOINT = "/api/finance/sync";
const PUSH_BATCH = 500;
const BACKOFF_START_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;
const PULL_INTERVAL_MS = 60_000;

interface SyncLoopOptions {
  store: ReplicaStore;
  fetch?: typeof fetch;
  /** Absolute in tests; the page uses the relative default. */
  endpoint?: string;
  /** The server says the session is gone: send the visitor to sign-in. */
  onUnauthorised?: () => void;
  /** Tests give another row shape to act as older or newer code. */
  rowShape?: number;
  isOnline?: () => boolean;
  isVisible?: () => boolean;
}

class SyncHttpError extends Error {
  readonly status: number;
  /** How long the server asked us to wait, from `Retry-After`. */
  readonly retryAfterMs: number;

  constructor(status: number, retryAfterMs = 0) {
    super(`Sync request failed with ${String(status)}`);
    this.name = "SyncHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

class RowShapeError extends Error {
  readonly serverRowShape: number;
  readonly serverIsNewer: boolean;

  constructor(serverRowShape: number, rowShape: number) {
    super(
      `The server has row shape ${String(serverRowShape)}, not ${String(rowShape)}`,
    );
    this.name = "RowShapeError";
    this.serverRowShape = serverRowShape;
    this.serverIsNewer = serverRowShape > rowShape;
  }
}

function retryAfterMsOf(response: Response): number {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1_000, BACKOFF_MAX_MS * 5)
    : 0;
}

function httpError(response: Response) {
  return new SyncHttpError(response.status, retryAfterMsOf(response));
}

function isUnauthorised(error: unknown) {
  return error instanceof SyncHttpError && error.status === 401;
}

function problemOf(error: unknown, online: boolean): SyncProblem {
  if (!online) return "offline";
  if (error instanceof RowShapeError) {
    return error.serverIsNewer ? "outdated" : "server-behind";
  }
  if (error instanceof SyncHttpError) {
    if (error.status === 401) return "unauthorised";
    if (error.status === 503) return "not-configured";
    if (error.status === 429) return "busy";
  }
  return "server";
}

/**
 * Keeps the Replica in step with the server: pushes the Outbox, then pulls
 * what changed since the Replica's clock, or bootstraps when it has none.
 * A failed push does not stop the pull: the Outbox stays on this device and
 * the status shows it as not sent. One run at a time; a trigger during a
 * run starts one more run after it. A failed run retries after 1 s,
 * doubling up to 60 s. A server with another row shape gets nothing from
 * this device and gives it nothing; while the server has a newer one, only
 * coming online, focus or the tab showing tries again.
 */
export function createSyncLoop(options: SyncLoopOptions) {
  const { store } = options;
  const rowShape = options.rowShape ?? REPLICA_ROW_SHAPE;
  const request = options.fetch ?? ((input, init) => fetch(input, init));
  const endpoint = options.endpoint ?? SYNC_ENDPOINT;
  const isOnline = options.isOnline ?? (() => navigator.onLine);
  const isVisible =
    options.isVisible ?? (() => document.visibilityState === "visible");

  let status: SyncStatus = {
    online: true,
    activity: "idle",
    pendingCount: store.getSnapshot().outboxCount,
    lastSyncedAt: store.getMeta().lastSyncedAt,
    problem: null,
    failures: 0,
    pushProblem: null,
    pushFailures: 0,
    leader: false,
    newerRowShape: null,
  };
  /** This device can not write the Replica; it shows over every other problem. */
  let storageFailed = false;
  /** The row shape of a newer tab. This tab then never syncs again. */
  let newerTabRowShape: number | null = null;
  let shown = status;
  const statusListeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let runAgain = false;
  let failures = 0;
  let pushFailures = 0;
  let retryAfterMs = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  function setStatus(patch: Partial<SyncStatus>) {
    status = { ...status, ...patch };
    let next = status;
    if (newerTabRowShape !== null) {
      next = {
        ...next,
        problem: "outdated",
        activity: "idle",
        leader: false,
        newerRowShape: Math.max(newerTabRowShape, next.newerRowShape ?? 0),
      };
    }
    if (storageFailed) next = { ...next, problem: "storage" };
    if (
      next.online === shown.online &&
      next.activity === shown.activity &&
      next.pendingCount === shown.pendingCount &&
      next.lastSyncedAt === shown.lastSyncedAt &&
      next.problem === shown.problem &&
      next.failures === shown.failures &&
      next.pushProblem === shown.pushProblem &&
      next.pushFailures === shown.pushFailures &&
      next.leader === shown.leader &&
      next.newerRowShape === shown.newerRowShape
    ) {
      return;
    }
    shown = next;
    for (const listener of statusListeners) listener();
  }

  async function send(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set(ROW_SHAPE_HEADER, String(rowShape));
    const response = await request(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers,
    });
    if (response.status === 401) {
      throw new SyncHttpError(401);
    }
    if (response.ok || response.status === ROW_SHAPE_MISMATCH_STATUS) {
      const serverRowShape = readRowShape(response.headers);
      if (serverRowShape !== undefined && serverRowShape !== rowShape) {
        throw new RowShapeError(serverRowShape, rowShape);
      }
    }
    return response;
  }

  async function push() {
    while (store.hasQueued()) {
      const mutations = store.takeOutbox(PUSH_BATCH);
      const ids = mutations.map((mutation) => mutation.id);
      setStatus({ activity: "pushing" });
      let response: Response;
      try {
        response = await send(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: store.getMeta().clientId,
            mutations,
          }),
        });
      } catch (error) {
        store.releaseOutbox(ids);
        throw error;
      }
      if (!response.ok) {
        store.releaseOutbox(ids);
        throw httpError(response);
      }
      store.acknowledge(ids, (await response.json()) as PushResponse);
    }
  }

  async function bootstrap() {
    const confirmed = store.awaitingIds();
    setStatus({ activity: "bootstrapping" });
    const response = await send(`${endpoint}?since=0`);
    if (!response.ok || !response.body) {
      throw httpError(response);
    }
    for await (const text of readNdjsonLines(response.body)) {
      const line = JSON.parse(text) as BootstrapLine;
      switch (line.type) {
        case "start": {
          store.startBootstrap(line.household);
          break;
        }
        case "rows": {
          store.applyBootstrapRows(line.table, line.rows);
          break;
        }
        case "end": {
          store.finishBootstrap(line.clock, confirmed);
          return;
        }
      }
    }
    throw new Error("The bootstrap stream ended early");
  }

  async function pull() {
    const confirmed = store.awaitingIds();
    setStatus({ activity: "pulling" });
    const response = await send(
      `${endpoint}?since=${String(store.getMeta().clock)}`,
    );
    if (response.status === 409) {
      store.requireBootstrap();
      await bootstrap();
      return;
    }
    if (!response.ok) throw httpError(response);
    store.applyPull((await response.json()) as PullResponse, confirmed);
  }

  /** Returns the error of a failed push, or null. A lost session or another row shape throws, because the download then fails too. */
  async function tryPush(): Promise<unknown> {
    try {
      await push();
    } catch (error) {
      if (isUnauthorised(error)) throw error;
      if (error instanceof RowShapeError) {
        pushFailures = 0;
        setStatus({ pushProblem: null, pushFailures: 0 });
        throw error;
      }
      pushFailures++;
      setStatus({ pushProblem: problemOf(error, isOnline()), pushFailures });
      return error;
    }
    pushFailures = 0;
    setStatus({ pushProblem: null, pushFailures: 0 });
    return null;
  }

  /** One run. Returns the push error when only the push failed; throws when the download failed. */
  async function runOnce(): Promise<unknown> {
    await store.mergeOutboxFromDisk();
    const pushError = await tryPush();
    const meta = store.getMeta();
    if (!meta.bootstrapped || meta.clock === 0) await bootstrap();
    else await pull();
    if (pushError !== null || !store.hasQueued()) return pushError;
    return tryPush();
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    if (stopped) return;
    const delay = Math.max(
      retryAfterMs,
      Math.min(
        BACKOFF_MAX_MS,
        BACKOFF_START_MS *
          2 ** Math.min(Math.max(failures, pushFailures) - 1, 10),
      ),
    );
    retryTimer = setTimeout(() => {
      void sync();
    }, delay);
  }

  function shouldRunAgain() {
    return runAgain && !stopped;
  }

  /** Runs one sync, or one more after the current one. Never rejects. */
  function sync(): Promise<void> {
    if (newerTabRowShape !== null) return Promise.resolve();
    if (running) {
      runAgain = true;
      return running;
    }
    running = (async () => {
      do {
        runAgain = false;
        const online = isOnline();
        if (!online) {
          setStatus({ online: false, problem: "offline", activity: "idle" });
          return;
        }
        try {
          const pushError = await runOnce();
          failures = 0;
          clearTimeout(retryTimer);
          setStatus({
            online: true,
            problem: null,
            failures: 0,
            activity: "idle",
            lastSyncedAt: store.getMeta().lastSyncedAt,
            newerRowShape: null,
          });
          if (pushError !== null) {
            retryAfterMs =
              pushError instanceof SyncHttpError ? pushError.retryAfterMs : 0;
            scheduleRetry();
            return;
          }
        } catch (error) {
          failures++;
          retryAfterMs =
            error instanceof SyncHttpError ? error.retryAfterMs : 0;
          const problem = problemOf(error, isOnline());
          setStatus({
            online: isOnline(),
            problem,
            activity: "idle",
            failures,
            newerRowShape:
              problem === "outdated" && error instanceof RowShapeError
                ? error.serverRowShape
                : null,
          });
          if (problem === "unauthorised") {
            options.onUnauthorised?.();
            return;
          }
          if (problem === "outdated") clearTimeout(retryTimer);
          else scheduleRetry();
          return;
        }
      } while (shouldRunAgain());
    })().finally(() => {
      running = null;
    });
    return running;
  }

  store.subscribe(() => {
    setStatus({ pendingCount: store.getSnapshot().outboxCount });
  });

  let detach: (() => void) | null = null;

  function stop() {
    stopped = true;
    clearTimeout(retryTimer);
    detach?.();
    detach = null;
    setStatus({ leader: false });
  }

  return {
    sync,

    getStatus: (): SyncStatus => {
      return shown;
    },

    /** Shows that the Replica can not write to disk, until a write works again. */
    setStorageFailed(failed: boolean) {
      storageFailed = failed;
      setStatus({});
    },

    subscribeStatus: (listener: () => void) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },

    /** Starts the triggers: a local change, coming online, the tab showing, focus, and every 60 s while visible and not outdated. */
    start() {
      stopped = false;
      setStatus({ leader: true });
      const onTrigger = () => {
        if (isVisible()) void sync();
      };
      const onPoll = () => {
        if (status.problem !== "outdated") onTrigger();
      };
      const onOnline = () => {
        setStatus({ online: true });
        failures = 0;
        pushFailures = 0;
        void sync();
      };
      const onOffline = () => {
        setStatus({ online: false, problem: "offline" });
      };
      const interval = setInterval(onPoll, PULL_INTERVAL_MS);
      const unsubscribeLocal = store.onLocalMutation(() => {
        void sync();
      });
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      window.addEventListener("focus", onTrigger);
      document.addEventListener("visibilitychange", onTrigger);
      detach = () => {
        clearInterval(interval);
        unsubscribeLocal();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("focus", onTrigger);
        document.removeEventListener("visibilitychange", onTrigger);
      };
      void sync();
    },

    stop,

    /** Syncs now, without waiting for the next retry. */
    retryNow(): Promise<void> {
      clearTimeout(retryTimer);
      retryAfterMs = 0;
      return sync();
    },

    /** A tab with a newer row shape is open: stops for good and shows that this tab must reload. */
    stopForNewerTab(newerRowShape: number) {
      newerTabRowShape = Math.max(newerTabRowShape ?? 0, newerRowShape);
      stop();
      setStatus({});
    },

    /** Shows the status a leader tab sent, in a tab that does not sync. */
    followStatus(leaderStatus: SyncStatus) {
      setStatus({
        ...leaderStatus,
        leader: false,
        pendingCount: store.getSnapshot().outboxCount,
      });
    },
  };
}

export type SyncLoop = ReturnType<typeof createSyncLoop>;
