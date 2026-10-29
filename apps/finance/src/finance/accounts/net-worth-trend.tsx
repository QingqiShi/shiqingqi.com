"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import type { ChartRange } from "../charts/chart-ranges.ts";
import { summariseSeries } from "../charts/summarise-series.ts";
import {
  TimeSeriesChart,
  type ChartPick,
} from "../charts/time-series-chart.tsx";
import { displayDayRange } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { selectNetWorthChart } from "./select-net-worth-chart.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { useStoredRange } from "./use-stored-range.ts";

/** The key under which this device keeps the range of the net-worth trend. */
const RANGE_KEY = "finance:net-worth-range";

/** The Shared element of the net-worth trend: the chart of the household view and its compact form in the sidebar. */
export const HOUSEHOLD_TREND = "household-trend";

/** The range of the net-worth trend that this device remembers. */
export function useNetWorthRange() {
  return useStoredRange(RANGE_KEY, "6M");
}

interface NetWorthTrendProps {
  range: ChartRange;
  /** The drawing's height in pixels, or `"fill"` for the height of a flex column around it. */
  height: number | "fill";
  /** Hears each new pick; the parent then shows it in place of the readout. */
  onPick?: (pick: ChartPick | null) => void;
  /** In a Navigation split view, the name of the Shared element that the chart is a form of. */
  shared?: string;
  /** Below `md`, the plot goes through the gutter to the edges of the screen. */
  bleeds?: boolean;
}

/**
 * The net-worth trend chart over `range`, and the change over the range
 * for assistive technology. Unless it `bleeds`, it stays inside its
 * parent, such as a card. Only this part re-renders on a new range, so the
 * switch costs one sample of at most 400 days.
 */
export function NetWorthTrend({
  range,
  height,
  onPick,
  shared,
  bleeds = false,
}: NetWorthTrendProps) {
  const locale = useLocale();
  const today = useHouseholdToday();
  const currency = useBaseCurrency();
  const series = useReplica((snapshot) =>
    selectNetWorthChart(snapshot, range, today),
  );
  const summary = summariseSeries(series.values);
  const last =
    series.values.length > 0 ? series.values[series.values.length - 1] : 0;
  const money = (minor: number) =>
    formatMoney(minor, currency, locale, { wholeUnits: true });
  const rangeLabel = displayDayRange(
    series.days.length > 0 ? series.days[0] : today,
    today,
    locale,
  );

  return (
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
      bleeds={bleeds}
      onPick={onPick}
      shared={shared}
      restReadout={
        <span>
          {rangeLabel}
          {" · "}
          <MoneyChange
            changeMinor={last - summary.first}
            fromMinor={summary.first}
            currency={currency}
            tone
            whole
          />
          {" · "}
          {t({ en: "Average", zh: "平均" })}{" "}
          <span css={typeModifier.numeric}>
            {money(Math.round(summary.average))}
          </span>
        </span>
      }
    />
  );
}
