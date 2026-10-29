"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useStoredRange } from "../accounts/use-stored-range.ts";
import { formatReportWeek } from "./format-report-week.ts";
import type {
  ReportListItem,
  WeeklyReportResponse,
} from "./report-api-schemas.ts";
import { ReportBackLink } from "./report-back-link.tsx";
import { ReportBalanceSheet } from "./report-balance-sheet.tsx";
import { reportColumns } from "./report-columns.stylex.ts";
import { ReportFooter } from "./report-footer.tsx";
import { ReportGroupNets } from "./report-group-nets.tsx";
import { ReportHeadline } from "./report-headline.tsx";
import { ReportMovesChart } from "./report-moves-chart.tsx";
import { ReportPropertyNet } from "./report-property-net.tsx";
import { ReportSharePanel } from "./report-share-panel.tsx";
import { ReportSpending } from "./report-spending.tsx";
import { ReportTrend } from "./report-trend.tsx";
import { ReportWeekNav } from "./report-week-nav.tsx";

interface ReportViewProps {
  report: WeeklyReportResponse;
  headingLevel: 1 | 2;
  older: ReportListItem | null;
  newer: ReportListItem | null;
}

/**
 * A weekly Report: net worth, its trend, the balance sheet, the net of each
 * Group, what moved over the week, the property net, and the week's
 * spending. In a wide container the charts take one column and the balance
 * sheet the other.
 */
export function ReportView({
  report,
  headingLevel,
  older,
  newer,
}: ReportViewProps) {
  const locale = useLocale();
  const { data } = report;
  const sectionLevel = headingLevel === 1 ? 2 : 3;
  const [range, setRange] = useStoredRange("finance:report-range", "all");

  return (
    <article css={[stack.section, layout.container]}>
      <header css={stack.item}>
        <ReportBackLink />
        <div css={[cluster.item, styles.titleRow]}>
          <div css={styles.titleBlock}>
            <Text look="overline" tone="muted">
              {t({ en: "Weekly report", zh: "周报" })}
            </Text>
            <Heading level={headingLevel} look="h3">
              {formatReportWeek(data.periodStart, data.periodEnd, locale)}
            </Heading>
          </div>
          <ReportWeekNav older={older} newer={newer} />
        </div>
        <ReportSharePanel report={report} />
      </header>
      <ReportHeadline data={data} />
      <div css={[reportColumns.base, layout.columns]}>
        <div css={stack.section}>
          <ReportTrend
            data={data}
            headingLevel={sectionLevel}
            range={range}
            onRangeChange={setRange}
          />
          <ReportGroupNets data={data} headingLevel={sectionLevel} />
          <ReportMovesChart data={data} headingLevel={sectionLevel} />
          <ReportPropertyNet
            data={data}
            range={range}
            headingLevel={sectionLevel}
          />
        </div>
        <ReportBalanceSheet data={data} headingLevel={sectionLevel} />
      </div>
      <ReportSpending data={data} headingLevel={sectionLevel} />
      <ReportFooter report={report} />
    </article>
  );
}

const layout = stylex.create({
  container: {
    containerType: "inline-size",
  },
  columns: {
    gap: rhythm.section,
  },
});

const styles = stylex.create({
  titleBlock: {
    display: "flex",
    flexDirection: "column",
  },
  titleRow: {
    justifyContent: "space-between",
    alignItems: "end",
    rowGap: rhythm.tight,
  },
});
