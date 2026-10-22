"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { ChartRange } from "../charts/chart-ranges.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { reportChartSeries } from "./report-chart-series.ts";
import { ReportSection } from "./report-section.tsx";
import { trendInRange } from "./trend-in-range.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Property less the loans against it, its change over the week, and its trend over `range`. Absent without a property Account. */
export function ReportPropertyNet({
  data,
  range,
  headingLevel,
}: {
  data: WeeklyReportData;
  range: ChartRange;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  if (data.propertyNetMinor === null) return null;
  const series = reportChartSeries(trendInRange(data, range), "propertyNet");
  const previous = data.trend.at(-2)?.propertyNetMinor ?? null;
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);

  return (
    <ReportSection
      title={t({ en: "Property net", zh: "房产净值" })}
      headingLevel={headingLevel}
    >
      <div css={stack.text}>
        <span css={[typeRole.h3, typeModifier.numeric]}>
          {money(data.propertyNetMinor)}
        </span>
        {previous === null ? null : (
          <p css={[cluster.tight, typeRole.bodySmall, styles.line]}>
            <MoneyChange
              changeMinor={data.propertyNetMinor - previous}
              fromMinor={previous}
              currency={currency}
              tone
            />
            <Text as="span" look="bodySmall" tone="muted">
              {t({ en: "vs last week", zh: "较上周" })}
            </Text>
          </p>
        )}
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Property value less the loans in the liability groups named after it.",
            zh: "房产价值减去以它命名的负债分组中的贷款。",
          })}
        </Text>
      </div>
      {series !== null && series.days.length > 1 ? (
        <TimeSeriesChart
          series={series}
          label={t({ en: "Property net", zh: "房产净值" })}
          description={t({
            en: "Property value less its loans at the end of every week in the range.",
            zh: "所选时间范围内每周末房产价值减去其贷款后的净值。",
          })}
          formatValue={money}
          currency={currency}
          height={160}
        />
      ) : null}
    </ReportSection>
  );
}

const styles = stylex.create({
  line: {
    margin: 0,
  },
});
