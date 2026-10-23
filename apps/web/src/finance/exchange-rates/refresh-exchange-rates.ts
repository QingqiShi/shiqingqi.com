import type { FinanceDb } from "../db/types.ts";
import { asFinanceApp, withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import {
  exchangeRateRepository,
  unorderedPairKey,
  type PairSpan,
} from "./exchange-rate-repository.ts";
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

function missingRanges(
  pair: HouseholdPair,
  span: PairSpan | undefined,
  today: string,
): [string, string][] {
  const firstEcbDay = firstEcbDayOf(pair);
  if (firstEcbDay === null) return [];
  const needed =
    pair.firstDay !== null && pair.firstDay < today ? pair.firstDay : today;
  const from = needed > firstEcbDay ? needed : firstEcbDay;
  if (span?.earliest == null || span.latest === null) return [[from, today]];
  const ranges: [string, string][] = [];
  if (from < span.earliest) ranges.push([from, addDays(span.earliest, -1)]);
  if (span.latest < today) ranges.push([addDays(span.latest, 1), today]);
  return ranges;
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
  const spans = await asFinanceApp(db, (app) =>
    exchangeRateRepository.spans(app, pairs, today),
  );
  for (const pair of pairs) {
    const span = spans.get(unorderedPairKey(pair));
    const orientation = span?.orientation ?? pair;
    try {
      for (const [start, end] of missingRanges(pair, span, today)) {
        const rows = await fetchEcbRates(
          dependencies.fetch,
          orientation,
          start,
          end,
        );
        totals.added += await asFinanceApp(db, (app) =>
          exchangeRateRepository.insertNew(app, rows),
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
