"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { formatMoney } from "../domain/money/format-money.ts";
import { ReportBarList } from "./report-bar-list.tsx";
import { ReportSection } from "./report-section.tsx";
import { ReportSplitBar } from "./report-split-bar.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/**
 * The net of each Group family — an asset Group less the liability Groups
 * named after it — as bars either side of zero, then assets against
 * liabilities. The nets add up to net worth.
 */
export function ReportGroupNets({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  return (
    <ReportSection
      title={t({ en: "Net by group", zh: "分组净值" })}
      headingLevel={headingLevel}
    >
      <ReportBarList
        bars={data.groupNets.map((net) => ({
          key: net.groupIds.join(),
          label: net.name,
          valueMinor: net.valueMinor,
          value: formatMoney(net.valueMinor, data.baseCurrency, locale),
        }))}
      />
      <ReportSplitBar data={data} />
    </ReportSection>
  );
}
