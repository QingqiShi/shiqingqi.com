import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import type { ReportContext } from "./create-report-context.ts";
import { exponentialMovingAverage } from "./exponential-moving-average.ts";
import { weekEndsBetween } from "./week-ends-between.ts";
import {
  TREND_AVERAGE_WEEKS,
  type TrendPoint,
} from "./weekly-report-data-schema.ts";

/**
 * Net worth at every week end from the first balance other than zero to
 * `lastWeekEnd`, with its moving average and the property net. A point
 * depends only on the weeks up to it, so the trend of an earlier week is a
 * prefix of this one.
 */
export function computeNetWorthTrend(
  context: ReportContext,
  lastWeekEnd: string,
): TrendPoint[] {
  if (context.firstDay === null) return [];
  const weekEnds = weekEndsBetween(context.firstDay, lastWeekEnd);
  const netWorths = weekEnds.map((day) =>
    netWorthAt(context.accounts, context.seriesByAccount, context.fx, day),
  );
  const averages = exponentialMovingAverage(netWorths, TREND_AVERAGE_WEEKS);
  const hasProperty = context.propertyAccounts.length > 0;
  return weekEnds.map((day, index) => ({
    day,
    netWorthMinor: netWorths[index],
    averageMinor: Math.round(averages[index]) || 0,
    propertyNetMinor: hasProperty
      ? netWorthAt(
          context.propertyAccounts,
          context.seriesByAccount,
          context.fx,
          day,
        )
      : null,
  }));
}
