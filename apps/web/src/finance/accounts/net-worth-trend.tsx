"use client";

import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { summariseSeries } from "../charts/summarise-series.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { selectNetWorthChart } from "./select-net-worth-chart.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { useStoredRange } from "./use-stored-range.ts";

/**
 * The net-worth trend chart with its range chips and the change over the
 * picked range. Only this part re-renders on a new range, so the switch
 * costs one sample of at most 400 days.
 */
export function NetWorthTrend({ height }: { height?: number }) {
  const locale = useLocale();
  const today = useHouseholdToday();
  const currency = useBaseCurrency();
  const [range, setRange] = useStoredRange("finance:net-worth-range", "6M");
  const series = useReplica((snapshot) =>
    selectNetWorthChart(snapshot, range, today),
  );
  const summary = summariseSeries(series.values);
  const last =
    series.values.length > 0 ? series.values[series.values.length - 1] : 0;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const startLabel = displayDay(
    series.days.length > 0 ? series.days[0] : today,
    locale,
    "dayYear",
  );
  const rangeLabel = `${startLabel} – ${displayDay(today, locale, "dayYear")}`;

  return (
    <section css={stack.item} aria-label={t({ en: "Trend", zh: "趋势" })}>
      <TimeSeriesChart
        series={series}
        label={t({ en: "Net worth", zh: "净资产" })}
        description={t({
          en: "Net worth at the end of each day in the range.",
          zh: "所选时间范围内每天结束时的净资产。",
        })}
        formatValue={money}
        currency={currency}
        height={height}
        restReadout={
          <span>
            {rangeLabel}
            {" · "}
            <MoneyChange
              changeMinor={last - summary.first}
              fromMinor={summary.first}
              currency={currency}
              tone
            />
            {" · "}
            {t({ en: "Average", zh: "平均" })}{" "}
            <span css={typeModifier.numeric}>
              {money(Math.round(summary.average))}
            </span>
          </span>
        }
      />
      <ChartRangeChips value={range} onChange={setRange} />
    </section>
  );
}
