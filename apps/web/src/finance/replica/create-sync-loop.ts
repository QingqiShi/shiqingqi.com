import { exchangeRateCursor } from "../exchange-rates/exchange-rate-cursor.ts";
import { exchangeRatesResponseSchema } from "../exchange-rates/exchange-rate-row-schema.ts";
import { firstEcbDayOf } from "../exchange-rates/supported-currencies.ts";
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
const EXCHANGE_RATES_ENDPOINT = "/api/finance/exchange-rates";
const EXCHANGE_RATES_INTERVAL_MS = 15 * 60_000;
const EXCHANGE_RATES_RETRY_START_MS = 30_000;
const FIRST_EXCHANGE_RATES_TIMEOUT_MS = 5_000;
const FIRST_EXCHANGE_RATES_RETRY_START_MS = 2_000;
const PUSH_BATCH = 500;
const BACKOFF_START_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;
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

/** Rejects when `signal` aborts, also when `promise` does not listen to it. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(new Error("The request was aborted", { cause: signal.reason }));
      },
      { once: true },
    );
    promise.then(resolve, reject);
  });
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
  const exchangeRatesEndpoint =
    options.exchangeRatesEndpoint ?? EXCHANGE_RATES_ENDPOINT;
  const now = options.now ?? (() => Date.now());
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
  let exchangeRatesTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let exchangeRatesDueAt = -Infinity;
  let exchangeRatesFailed = false;
  let exchangeRatesRetries = 0;
  let firstExchangeRatesTried = false;
  let downloadedExchangeRates = false;
  let servedPairsId: string | null = null;
  let householdPairsId: string | null = null;

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
          householdPairsId = line.exchangeRatePairsId ?? householdPairsId;
          store.startBootstrap(line.household);
          break;
        }
        case "rows": {
          store.applyBootstrapRows(line.table, line.rows);
          break;
        }
        case "end": {
          const isFirst =
            !firstExchangeRatesTried &&
            store.getMeta().exchangeRateCursor === null;
          firstExchangeRatesTried = true;
          const gotFirstRates =
            isFirst &&
            (await downloadExchangeRates(FIRST_EXCHANGE_RATES_TIMEOUT_MS));
          store.finishBootstrap(line.clock, confirmed);
          if (gotFirstRates) scheduleExchangeRates();
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
    householdPairsId = changes.exchangeRatePairsId ?? householdPairsId;
    store.applyPull(changes, confirmed);
  }

  function exchangeRatesDue() {
    if (now() >= exchangeRatesDueAt) return true;
    return (
      !exchangeRatesFailed &&
      householdPairsId !== null &&
      householdPairsId !== servedPairsId
    );
  }

  function householdLacksRates() {
    const { household, tables, exchangeRates } = store.getSnapshot();
    if (!household) return false;
    const quote = household.baseCurrency;
    const withRates = new Set<string>();
    for (const rate of exchangeRates.values()) {
      if (rate.quote === quote) withRates.add(rate.base);
      if (rate.base === quote) withRates.add(rate.quote);
    }
    for (const account of tables.accounts.values()) {
      const base = account.currency;
      if (
        account.deletedAt === null &&
        base !== quote &&
        !withRates.has(base) &&
        firstEcbDayOf({ base, quote }) !== null
      ) {
        return true;
      }
    }
    return false;
  }

  /** A device with no rates yet tries again soon, and does not wait for the next run. */
  function retryExchangeRatesLater() {
    exchangeRatesRetries++;
    const hasNoRates =
      !downloadedExchangeRates && store.getMeta().exchangeRateCursor === null;
    const delay = Math.min(
      EXCHANGE_RATES_INTERVAL_MS,
      (hasNoRates
        ? FIRST_EXCHANGE_RATES_RETRY_START_MS
        : EXCHANGE_RATES_RETRY_START_MS) *
        2 ** Math.min(exchangeRatesRetries - 1, 10),
    );
    exchangeRatesDueAt = now() + delay;
    clearTimeout(exchangeRatesTimer);
    if (hasNoRates && !stopped) {
      exchangeRatesTimer = setTimeout(() => {
        void sync();
      }, delay);
    }
  }

  async function fetchExchangeRates(signal: AbortSignal) {
    const cursor = store.getMeta().exchangeRateCursor;
    const response = await send(
      cursor
        ? `${exchangeRatesEndpoint}?since=${encodeURIComponent(cursor)}`
        : exchangeRatesEndpoint,
      { signal },
    );
    if (!response.ok) throw httpError(response);
    return exchangeRatesResponseSchema.parse(await response.json());
  }

  /**
   * Downloads the rates that are new since the last download, and gives up
   * after `timeoutMs`. True when it got them. Only a lost session or another
   * row shape throws; the rates on the device stay in use.
   */
  async function downloadExchangeRates(timeoutMs?: number) {
    const controller = new AbortController();
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            controller.abort(new Error("The exchange rates took too long"));
          }, timeoutMs);
    try {
      const rates = await untilAborted(
        fetchExchangeRates(controller.signal),
        controller.signal,
      );
      store.applyExchangeRates(rates);
      const pairsId = exchangeRateCursor.parse(rates.cursor)?.pairsId ?? null;
      if (pairsId !== servedPairsId) exchangeRatesRetries = 0;
      servedPairsId = pairsId;
      exchangeRatesFailed = false;
      downloadedExchangeRates = true;
      clearTimeout(exchangeRatesTimer);
    } catch (error) {
      if (isUnauthorised(error) || error instanceof RowShapeError) throw error;
      exchangeRatesFailed = true;
      retryExchangeRatesLater();
      return false;
    } finally {
      clearTimeout(timer);
    }
    return true;
  }

  /**
   * A pair with no rate yet waits for the download that the server starts
   * after the push, so it retries soon.
   */
  function scheduleExchangeRates() {
    if (householdLacksRates()) {
      retryExchangeRatesLater();
    } else {
      exchangeRatesRetries = 0;
      exchangeRatesDueAt = now() + EXCHANGE_RATES_INTERVAL_MS;
    }
  }

  async function refreshExchangeRates() {
    if (!exchangeRatesDue()) return;
    if (await downloadExchangeRates()) scheduleExchangeRates();
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
    await refreshExchangeRates();
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
    clearTimeout(exchangeRatesTimer);
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
