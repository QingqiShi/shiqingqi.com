import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import type {
  BootstrapLine,
  PullResponse,
  PushResponse,
} from "../sync/types.ts";
import { createExchangeRateDownloads } from "./create-exchange-rate-downloads.ts";
import type { ReplicaStore } from "./create-replica-store.ts";
import {
  BACKOFF_MAX_MS,
  createSyncSender,
  httpError,
  isUnauthorised,
  problemOf,
  RowShapeError,
  SyncHttpError,
} from "./create-sync-sender.ts";
import { createSyncStatusStore } from "./create-sync-status-store.ts";
import { readNdjsonLines } from "./read-ndjson-lines.ts";
import type { SyncStatus } from "./types.ts";

const SYNC_ENDPOINT = "/api/sync";
const PUSH_BATCH = 500;
const BACKOFF_START_MS = 1_000;
const PULL_INTERVAL_MS = 60_000;

interface SyncLoopOptions {
  store: ReplicaStore;
  fetch?: typeof fetch;
  /** Absolute in tests; the page uses the relative default. */
  endpoint?: string;
  /** Absolute in tests; the page uses the relative default. */
  exchangeRatesEndpoint?: string;
  now?: () => number;
  /** The server says the session is gone: send the visitor to sign-in. */
  onUnauthorised?: () => void;
  /** Tests give another row shape to act as older or newer code. */
  rowShape?: number;
  /** False keeps the Outbox in this tab and out of the changes that wait to sync. */
  sendOutbox?: boolean;
  isOnline?: () => boolean;
  isVisible?: () => boolean;
}

/**
 * Keeps the Replica in step with the server: pushes the Outbox, then pulls
 * what changed since the Replica's clock, or bootstraps when it has none,
 * then pushes what was queued meanwhile, then downloads new exchange rates.
 * A device with no exchange rates tries to download them before its
 * bootstrap finishes, for at most 5 s. When that fails, the bootstrap
 * finishes without them, a currency with no rate counts one unit as one
 * unit of the base currency, and a timer tries the download again after 2 s,
 * doubling, until it gets them.
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
  const now = options.now ?? (() => Date.now());
  const sendsOutbox = options.sendOutbox ?? true;
  const pendingCount = () =>
    sendsOutbox ? store.getSnapshot().outboxCount : 0;
  const isOnline = options.isOnline ?? (() => navigator.onLine);
  const isVisible =
    options.isVisible ?? (() => document.visibilityState === "visible");

  const initialStatus: SyncStatus = {
    online: true,
    activity: "idle",
    pendingCount: pendingCount(),
    lastSyncedAt: store.getMeta().lastSyncedAt,
    problem: null,
    failures: 0,
    pushProblem: null,
    pushFailures: 0,
    leader: false,
    newerRowShape: null,
  };
  const syncStatus = createSyncStatusStore(initialStatus);
  const { setStatus } = syncStatus;
  let running: Promise<void> | null = null;
  let runAgain = false;
  let failures = 0;
  let pushFailures = 0;
  let retryAfterMs = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const send = createSyncSender(request, rowShape);
  const rateDownloads = createExchangeRateDownloads({
    store,
    send,
    exchangeRatesEndpoint: options.exchangeRatesEndpoint,
    now,
    isStopped: () => stopped,
    sync,
  });

  async function push() {
    if (!sendsOutbox) return;
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
          rateDownloads.noteHouseholdPairsId(line.exchangeRatePairsId);
          store.startBootstrap(line.household);
          break;
        }
        case "rows": {
          store.applyBootstrapRows(line.table, line.rows);
          break;
        }
        case "end": {
          const isFirst = rateDownloads.claimFirstDownload();
          const gotFirstRates =
            isFirst && (await rateDownloads.downloadFirstExchangeRates());
          store.finishBootstrap(line.clock, confirmed);
          if (gotFirstRates) rateDownloads.scheduleExchangeRates();
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
    const changes = (await response.json()) as PullResponse;
    rateDownloads.noteHouseholdPairsId(changes.exchangeRatePairsId);
    store.applyPull(changes, confirmed);
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
    let pushError = await tryPush();
    const meta = store.getMeta();
    if (!meta.bootstrapped || meta.clock === 0) await bootstrap();
    else await pull();
    if (pushError === null && store.hasQueued()) pushError = await tryPush();
    await rateDownloads.refreshExchangeRates();
    return pushError;
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
    if (syncStatus.hasNewerTab()) return Promise.resolve();
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
            // A sign-out stops the loop, then ends the session. A sync that
            // was on its way then fails, and must not move the page.
            if (!stopped) options.onUnauthorised?.();
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
    setStatus({ pendingCount: pendingCount() });
  });

  let detach: (() => void) | null = null;

  function stop() {
    stopped = true;
    clearTimeout(retryTimer);
    rateDownloads.cancelTimer();
    detach?.();
    detach = null;
    setStatus({ leader: false });
  }

  return {
    sync,

    getStatus: syncStatus.getStatus,

    getServerStatus: syncStatus.getServerStatus,

    setStorageFailed: syncStatus.setStorageFailed,

    subscribeStatus: syncStatus.subscribeStatus,

    /** Starts the triggers: a local change, coming online, the tab showing, focus, and every 60 s while visible and not outdated. */
    start() {
      stopped = false;
      setStatus({ leader: true });
      const onTrigger = () => {
        if (isVisible()) void sync();
      };
      const onPoll = () => {
        if (syncStatus.reportedProblem() !== "outdated") onTrigger();
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
      syncStatus.noteNewerTab(newerRowShape);
      stop();
      setStatus({});
    },

    /** Shows the status a leader tab sent, in a tab that does not sync. */
    followStatus(leaderStatus: SyncStatus) {
      setStatus({
        ...leaderStatus,
        leader: false,
        pendingCount: pendingCount(),
      });
    },
  };
}

export type SyncLoop = ReturnType<typeof createSyncLoop>;
