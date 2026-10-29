import type { FinanceDb } from "../db/types.ts";
import { asFinanceApp, withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import {
  exchangeRateRepository,
  unorderedPairKey,
  type DayRange,
  type PairSpan,
} from "./exchange-rate-repository.ts";
import type { ExchangeRateRow } from "./exchange-rate-row-schema.ts";
import { fetchEcbRates } from "./fetch-ecb-rates.ts";
import {
  findHouseholdPairsWithFirstDays,
  type HouseholdPair,
} from "./find-household-pairs.ts";
import { firstEcbDayOf } from "./supported-currencies.ts";

export interface RefreshExchangeRatesDependencies {
  fetch: typeof fetch;
  now: () => Date;
}

export interface RefreshExchangeRatesTotals {
  pairs: number;
  added: number;
  failed: number;
}

/**
 * The pairs of `householdIds`, each once in either orientation (in the
 * orientation the first Household that uses it has), with the earliest first
 * day any of them needs.
 */
export async function collectHouseholdPairs(
  db: FinanceDb,
  householdIds: readonly string[],
): Promise<HouseholdPair[]> {
  const pairs = new Map<string, HouseholdPair>();
  for (const householdId of householdIds) {
    const found = await withHousehold(db, householdId, (scope) =>
      findHouseholdPairsWithFirstDays(scope),
    );
    for (const pair of found) {
      const key = unorderedPairKey(pair);
      const current = pairs.get(key);
      const firstDay =
        current?.firstDay == null
          ? pair.firstDay
          : pair.firstDay === null || current.firstDay < pair.firstDay
            ? current.firstDay
            : pair.firstDay;
      pairs.set(key, { ...(current ?? pair), firstDay });
    }
  }
  return [...pairs.values()];
}

/** Gaps closer than this share one download. */
const GAP_MERGE_DAYS = 31;

interface Download {
  start: string;
  end: string;
  /**
   * When set, only the rows on these days are kept. A day outside them can
   * already have a rate in the other orientation, and the primary key does
   * not stop a second one.
   */
  keep?: readonly DayRange[];
}

function missingDownloads(
  pair: HouseholdPair,
  span: PairSpan | undefined,
  gaps: readonly DayRange[],
  today: string,
): Download[] {
  const firstEcbDay = firstEcbDayOf(pair);
  if (firstEcbDay === null) return [];
  const needed =
    pair.firstDay !== null && pair.firstDay < today ? pair.firstDay : today;
  const from = needed > firstEcbDay ? needed : firstEcbDay;
  if (span?.earliest == null || span.latest === null) {
    return [{ start: from, end: today }];
  }
  const downloads: Download[] = [];
  if (from < span.earliest) {
    downloads.push({ start: from, end: addDays(span.earliest, -1) });
  }
  for (const [gapStart, end] of gaps) {
    const start = gapStart > from ? gapStart : from;
    if (start > end) continue;
    const last = downloads.at(-1);
    if (last?.keep && addDays(last.end, GAP_MERGE_DAYS) >= start) {
      last.end = end;
      last.keep = [...last.keep, [start, end]];
    } else {
      downloads.push({ start, end, keep: [[start, end]] });
    }
  }
  if (span.latest < today) {
    downloads.push({ start: addDays(span.latest, 1), end: today });
  }
  return downloads;
}

function isKept(row: ExchangeRateRow, keep: readonly DayRange[] | undefined) {
  return (
    keep === undefined ||
    keep.some(([start, end]) => row.on >= start && row.on <= end)
  );
}

/**
 * Each pair keeps one orientation: the one most of its rows have, else the
 * one it came in. Readers invert it.
 */
export async function refreshExchangeRates(
  db: FinanceDb,
  pairs: readonly HouseholdPair[],
  dependencies: RefreshExchangeRatesDependencies,
): Promise<RefreshExchangeRatesTotals> {
  const totals: RefreshExchangeRatesTotals = {
    pairs: pairs.length,
    added: 0,
    failed: 0,
  };
  if (pairs.length === 0) return totals;
  const today = dependencies.now().toISOString().slice(0, 10);
  const { spans, gaps } = await asFinanceApp(db, async (app) => ({
    spans: await exchangeRateRepository.spans(app, pairs, today),
    gaps: await exchangeRateRepository.gaps(app, pairs, today),
  }));
  for (const pair of pairs) {
    const key = unorderedPairKey(pair);
    const span = spans.get(key);
    const orientation = span?.orientation ?? pair;
    try {
      for (const { start, end, keep } of missingDownloads(
        pair,
        span,
        gaps.get(key) ?? [],
        today,
      )) {
        const rows = await fetchEcbRates(
          dependencies.fetch,
          orientation,
          start,
          end,
        );
        const kept = rows.filter((row) => isKept(row, keep));
        totals.added += await asFinanceApp(db, (app) =>
          exchangeRateRepository.insertNew(app, kept),
        );
      }
    } catch (error) {
      console.error(
        `Exchange rates failed for ${pair.base}/${pair.quote}`,
        error,
      );
      totals.failed++;
    }
  }
  return totals;
}

export async function refreshHouseholdExchangeRates(
  db: FinanceDb,
  householdId: string,
  dependencies: RefreshExchangeRatesDependencies,
): Promise<RefreshExchangeRatesTotals> {
  const pairs = await withHousehold(db, householdId, (scope) =>
    findHouseholdPairsWithFirstDays(scope),
  );
  return refreshExchangeRates(db, pairs, dependencies);
}
