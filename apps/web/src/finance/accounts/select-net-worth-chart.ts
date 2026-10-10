import {
  buildChartSeries,
  type ChartSeries,
} from "../charts/build-chart-series.ts";
import { chartRangeStart } from "../charts/chart-range-start.ts";
import type { ChartRange } from "../charts/chart-ranges.ts";
import { firstActiveDay } from "../charts/first-active-day.ts";
import { sampleBalances } from "../charts/sample-balances.ts";
import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";
import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import type { NetWorthAccount } from "../domain/balance/net-worth-at.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";

/** The trend line on the Net worth chart: a 13-week average. */
const NET_WORTH_TREND_DAYS = 91;

interface Cached {
  accounts: readonly NetWorthAccount[];
  fx: FxIndex;
  firstDay: string | null;
  byRange: Map<string, ChartSeries>;
}

const cache = new WeakMap<ReadonlyMap<string, BalanceSeries>, Cached>();

function firstDayOf(seriesByAccount: ReadonlyMap<string, BalanceSeries>) {
  let first = Infinity;
  for (const series of seriesByAccount.values()) {
    const day = firstActiveDay(series);
    if (day !== null && day < first) first = day;
  }
  return first === Infinity ? null : fromEpochDay(first);
}

/**
 * Net worth over `range` ending on `today`, with its 13-week average. Each
 * range is worked out once per change to the Replica, so switching back to
 * a range is a lookup.
 */
export function selectNetWorthChart(
  snapshot: ReplicaSnapshot,
  range: ChartRange,
  today: string,
): ChartSeries {
  const seriesByAccount = selectBalanceSeriesByAccount(snapshot);
  const accounts = liveRowSelectors.accounts(snapshot);
  const fx = selectFxIndex(snapshot);
  let cached = cache.get(seriesByAccount);
  if (cached?.accounts !== accounts || cached.fx !== fx) {
    cached = {
      accounts,
      fx,
      firstDay: firstDayOf(seriesByAccount),
      byRange: new Map(),
    };
    cache.set(seriesByAccount, cached);
  }
  const key = `${range}|${today}`;
  const hit = cached.byRange.get(key);
  if (hit) return hit;
  const started = performance.now();
  const series = buildChartSeries({
    start: chartRangeStart(range, today, cached.firstDay),
    end: today,
    firstDay: cached.firstDay,
    valuesAt: (days) => sampleBalances(accounts, seriesByAccount, fx, days),
    trendWindowDays: NET_WORTH_TREND_DAYS,
  });
  cached.byRange.set(key, series);
  if (process.env.NODE_ENV !== "production") {
    performance.measure("finance:net-worth-chart", {
      start: started,
      detail: range,
    });
  }
  return series;
}
