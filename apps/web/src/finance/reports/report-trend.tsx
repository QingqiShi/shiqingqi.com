"use client";

import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import type { ChartRange } from "../charts/chart-ranges.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { reportChartSeries } from "./report-chart-series.ts";
import { ReportSection } from "./report-section.tsx";
import { trendInRange } from "./trend-in-range.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

interface ReportTrendProps {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

/** Net worth at each week end of the picked range, with its 13-week moving average. */
export function ReportTrend({
  data,
  headingLevel,
  range,
  onRangeChange,
}: ReportTrendProps) {
  const locale = useLocale();
  const trend = trendInRange(data, range);
  const series = reportChartSeries(trend, "netWorth");
  if (data.trend.length < 2) return null;
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const first = trend[0];
  const latestAverage = trend[trend.length - 1].averageMinor;
  const averageLabel = t({ en: "13-week average", zh: "13 周均线" });

  return (
    <ReportSection
      title={t({ en: "Net worth trend", zh: "净资产趋势" })}
      headingLevel={headingLevel}
    >
      {series === null || trend.length < 2 ? null : (
        <TimeSeriesChart
          series={series}
          label={t({ en: "Net worth", zh: "净资产" })}
          trend={{
            label: averageLabel,
            values: Float64Array.from(trend, (point) => point.averageMinor),
          }}
          description={t({
            en: "Net worth at the end of every week in the range, with its 13-week moving average.",
            zh: "所选时间范围内每周末的净资产，以及 13 周移动平均线。",
          })}
          formatValue={money}
          currency={currency}
          height={240}
          restReadout={
            <span>
              {displayDay(first.day, locale, "dayYear")}
              {" – "}
              {displayDay(data.periodEnd, locale, "dayYear")}
              {" · "}
              <MoneyChange
                changeMinor={
                  data.balanceSheet.netWorthMinor - first.netWorthMinor
                }
                fromMinor={first.netWorthMinor}
                currency={currency}
                tone
              />
              {" · "}
              {averageLabel}{" "}
              <span css={typeModifier.numeric}>{money(latestAverage)}</span>
            </span>
          }
        />
      )}
      <ChartRangeChips value={range} onChange={onRangeChange} />
    </ReportSection>
  );
}
