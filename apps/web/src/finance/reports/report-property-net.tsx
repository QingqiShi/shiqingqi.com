"use client";

import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { formatMoney } from "../domain/money/format-money.ts";
import { reportChartSeries } from "./report-chart-series.ts";
import { ReportSection } from "./report-section.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Property less the loans against it, now and week by week. Absent without a property Account. */
export function ReportPropertyNet({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  if (data.propertyNetMinor === null) return null;
  const series = reportChartSeries(data.trend, "propertyNet");
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);

  return (
    <ReportSection
      title={t({ en: "Property net", zh: "房产净值" })}
      headingLevel={headingLevel}
    >
      <div css={stack.tight}>
        <span css={[typeRole.h3, typeModifier.numeric]}>
          {money(data.propertyNetMinor)}
        </span>
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
            en: "Property value less its loans at the end of every week.",
            zh: "每周末房产价值减去其贷款后的净值。",
          })}
          formatValue={money}
          formatTick={(minor, step) =>
            formatAxisMoney(minor, step, currency, locale)
          }
          height={160}
        />
      ) : null}
    </ReportSection>
  );
}
