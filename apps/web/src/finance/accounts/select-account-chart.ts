import {
  buildChartSeries,
  type ChartSeries,
} from "../charts/build-chart-series.ts";
import { chartRangeStart } from "../charts/chart-range-start.ts";
import type { ChartRange } from "../charts/chart-ranges.ts";
import { firstActiveDay } from "../charts/first-active-day.ts";
import { sampleAccountBalance } from "../charts/sample-balances.ts";
import {
  EMPTY_BALANCE_SERIES,
  type BalanceSeries,
} from "../domain/balance/compute-balance-days.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";

const cache = new WeakMap<BalanceSeries, Map<string, ChartSeries>>();

/** One account's balance over `range` ending on `today`, in its own currency. */
export function selectAccountChart(
  snapshot: ReplicaSnapshot,
  accountId: string,
  range: ChartRange,
  today: string,
): ChartSeries {
  const series =
    selectBalanceSeriesByAccount(snapshot).get(accountId) ??
    EMPTY_BALANCE_SERIES;
  const closedOn = snapshot.tables.accounts.get(accountId)?.closedOn ?? null;
  let byRange = cache.get(series);
  if (!byRange) {
    byRange = new Map();
    cache.set(series, byRange);
  }
  const key = `${range}|${today}|${closedOn ?? ""}`;
  const hit = byRange.get(key);
  if (hit) return hit;
  const active = firstActiveDay(series);
  const firstDay = active === null ? null : fromEpochDay(active);
  const chart = buildChartSeries({
    start: chartRangeStart(range, today, firstDay),
    end: today,
    firstDay,
    valuesAt: (days) => sampleAccountBalance(series, closedOn, days),
  });
  byRange.set(key, chart);
  return chart;
}
