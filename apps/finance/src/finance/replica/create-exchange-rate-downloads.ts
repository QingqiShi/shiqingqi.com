import { exchangeRateCursor } from "../exchange-rates/exchange-rate-cursor.ts";
import { exchangeRatesResponseSchema } from "../exchange-rates/exchange-rate-row-schema.ts";
import { firstEcbDayOf } from "../exchange-rates/supported-currencies.ts";
import type { ReplicaStore } from "./create-replica-store.ts";
import {
  httpError,
  isUnauthorised,
  RowShapeError,
  type SyncSender,
} from "./create-sync-sender.ts";

const EXCHANGE_RATES_ENDPOINT = "/api/exchange-rates";
const EXCHANGE_RATES_INTERVAL_MS = 15 * 60_000;
const EXCHANGE_RATES_RETRY_START_MS = 30_000;
const FIRST_EXCHANGE_RATES_TIMEOUT_MS = 5_000;
const FIRST_EXCHANGE_RATES_RETRY_START_MS = 2_000;

interface ExchangeRateDownloadsOptions {
  store: ReplicaStore;
  send: SyncSender;
  exchangeRatesEndpoint: string | undefined;
  now: () => number;
  isStopped: () => boolean;
  sync: () => Promise<void>;
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

export function createExchangeRateDownloads(
  options: ExchangeRateDownloadsOptions,
) {
  const { store, send, now, isStopped, sync } = options;
  const exchangeRatesEndpoint =
    options.exchangeRatesEndpoint ?? EXCHANGE_RATES_ENDPOINT;

  let exchangeRatesTimer: ReturnType<typeof setTimeout> | undefined;
  let exchangeRatesDueAt = -Infinity;
  let exchangeRatesFailed = false;
  let exchangeRatesRetries = 0;
  let firstExchangeRatesTried = false;
  let downloadedExchangeRates = false;
  let servedPairsId: string | null = null;
  let householdPairsId: string | null = null;

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
    if (hasNoRates && !isStopped()) {
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

  return {
    scheduleExchangeRates,
    refreshExchangeRates,

    noteHouseholdPairsId(pairsId: string | undefined) {
      householdPairsId = pairsId ?? householdPairsId;
    },

    claimFirstDownload() {
      const isFirst =
        !firstExchangeRatesTried && store.getMeta().exchangeRateCursor === null;
      firstExchangeRatesTried = true;
      return isFirst;
    },

    downloadFirstExchangeRates() {
      return downloadExchangeRates(FIRST_EXCHANGE_RATES_TIMEOUT_MS);
    },

    cancelTimer() {
      clearTimeout(exchangeRatesTimer);
    },
  };
}
