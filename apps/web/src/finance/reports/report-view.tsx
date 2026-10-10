"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatReportWeek } from "./format-report-week.ts";
import type {
  ReportListItem,
  WeeklyReportResponse,
} from "./report-api-schemas.ts";
import { ReportBackLink } from "./report-back-link.tsx";
import { ReportBalanceSheet } from "./report-balance-sheet.tsx";
import { ReportFooter } from "./report-footer.tsx";
import { ReportGroups } from "./report-groups.tsx";
import { ReportHeadline } from "./report-headline.tsx";
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

/** A weekly Report: net worth and its trend, the week's spending, the Groups, and the balance sheet. */
export function ReportView({
  report,
  headingLevel,
  older,
  newer,
}: ReportViewProps) {
  const locale = useLocale();
  const { data } = report;
  const sectionLevel = headingLevel === 1 ? 2 : 3;

  return (
    <article css={stack.section}>
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
      <ReportTrend data={data} headingLevel={sectionLevel} />
      <ReportSpending data={data} headingLevel={sectionLevel} />
      <ReportGroups data={data} headingLevel={sectionLevel} />
      <ReportBalanceSheet data={data} headingLevel={sectionLevel} />
      <ReportPropertyNet data={data} headingLevel={sectionLevel} />
      <ReportFooter report={report} />
    </article>
  );
}

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
