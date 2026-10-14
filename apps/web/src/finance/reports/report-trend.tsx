"use client";

import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { reportChartSeries } from "./report-chart-series.ts";
import { ReportSection } from "./report-section.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Net worth at each week end since the first balance, with its 13-week moving average. */
export function ReportTrend({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  const series = reportChartSeries(data.trend, "netWorth");
  if (series === null || series.days.length < 2) return null;
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const latestAverage = data.trend.at(-1)?.averageMinor ?? 0;
  const averageLabel = t({ en: "13-week average", zh: "13 周均线" });

  return (
    <ReportSection
      title={t({ en: "Net worth trend", zh: "净资产趋势" })}
      headingLevel={headingLevel}
    >
      <TimeSeriesChart
        series={series}
        label={t({ en: "Net worth", zh: "净资产" })}
        trend={{
          label: averageLabel,
          values: Float64Array.from(data.trend, (point) => point.averageMinor),
        }}
        description={t({
          en: "Net worth at the end of every week since the first balance, with its 13-week moving average.",
          zh: "自第一笔余额以来每周末的净资产，以及 13 周移动平均线。",
        })}
        formatValue={money}
        currency={currency}
        height={220}
        restReadout={
          <span>
            {displayDay(series.days[0], locale, "dayYear")}
            {" – "}
            {displayDay(data.periodEnd, locale, "dayYear")}
            {" · "}
            {averageLabel}{" "}
            <span css={typeModifier.numeric}>{money(latestAverage)}</span>
          </span>
        }
      />
    </ReportSection>
  );
}
