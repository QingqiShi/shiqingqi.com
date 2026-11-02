"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { Link } from "#src/links/link.tsx";
import type { ReportListItem } from "../report/read-report.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { formatListDay, formatMonth } from "./format-day.ts";

function groupByMonth(reports: readonly ReportListItem[]) {
  const months = new Map<string, ReportListItem[]>();
  for (const report of reports) {
    const month = report.localDate.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), report]);
  }
  return [...months].map(([month, inMonth]) => ({ month, reports: inMonth }));
}

interface ReportListProps {
  reports: readonly ReportListItem[];
  today: string;
  /** The report on screen, marked in the list. */
  currentDate: string | null;
  headingLevel: 1 | 2;
}

/** Every morning report, newest first and split by month. */
export function ReportList({
  reports,
  today,
  currentDate,
  headingLevel,
}: ReportListProps) {
  const locale = useLocale();
  const isWide = useIsWideLayout();
  const currentRef = useRef<HTMLElement>(null);
  const title = t({ en: "Past reports", zh: "往期晨报" });
  const noMail = t({ en: "No new mail", zh: "没有新邮件" });
  const notWritten = t({ en: "Not written", zh: "没能写成" });
  const todayLabel = t({ en: "Today", zh: "今天" });

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentDate]);

  return (
    <nav aria-label={title} css={stack.item}>
      <Heading level={headingLevel} look="h3">
        {title}
      </Heading>
      {reports.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Past reports are listed once the first one is written.",
            zh: "第一份晨报写好后，往期晨报会显示在这里。",
          })}
        </Text>
      ) : (
        groupByMonth(reports).map(({ month, reports: inMonth }) => (
          <section
            key={month}
            aria-label={formatMonth(month, locale)}
            css={[stack.tight, styles.month]}
          >
            <Text look="overline" tone="muted">
              {formatMonth(month, locale)}
            </Text>
            <List>
              {inMonth.map((report) => {
                const isCurrent = report.localDate === currentDate;
                return (
                  <ListRow
                    key={report.localDate}
                    ref={isCurrent ? currentRef : undefined}
                    href={getLocalePath(`/reports/${report.localDate}`, locale)}
                    linkComponent={Link}
                    aria-current={isCurrent ? "page" : undefined}
                    caret={!isWide}
                    detail={
                      report.headline ??
                      (report.status === "no-mail" ? noMail : notWritten)
                    }
                    trailing={
                      report.localDate === today ? (
                        <Badge intent="neutral" size="sm">
                          {todayLabel}
                        </Badge>
                      ) : null
                    }
                  >
                    <span css={typeModifier.numeric}>
                      {formatListDay(report.localDate, locale)}
                    </span>
                  </ListRow>
                );
              })}
            </List>
          </section>
        ))
      )}
    </nav>
  );
}

const styles = stylex.create({
  month: {
    paddingBlockStart: rhythm.tight,
  },
});
