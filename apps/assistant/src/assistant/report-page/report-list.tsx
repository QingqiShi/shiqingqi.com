"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import {
  SplitViewLink,
  StackedOnly,
  UnlessStacked,
  useSplitViewColumn,
} from "@tuja/ui/components/navigation-split-view";
import { sidebarEdge } from "@tuja/ui/components/navigation-split-view.stylex";
import { StatusDot } from "@tuja/ui/components/status-dot";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { homeViewHref } from "../home/choose-home-view.ts";
import type { ReportListItem } from "../report/read-report.ts";
import { useDateLocale } from "../shell/date-locale-provider.tsx";
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
  /** The report on screen, marked in the list. */
  currentDate: string | null;
  headingLevel: 1 | 2;
}

/**
 * Every morning report, newest first and split by month. The newest opens in
 * the home page's Report view, which shows it with the day's status.
 */
export function ReportList({
  reports,
  currentDate,
  headingLevel,
}: ReportListProps) {
  const locale = useLocale();
  const dateLocale = useDateLocale();
  const isPage = useSplitViewColumn()?.presentation === "page";
  const navRef = useRef<HTMLElement>(null);
  const title = t({ en: "All reports", zh: "全部晨报" });
  const noMail = t({ en: "No new mail", zh: "没有新邮件" });
  const notWritten = t({ en: "Not written", zh: "没能写成" });
  const newestDate = reports.at(0)?.localDate;

  useEffect(() => {
    if (isPage) return;
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [currentDate, isPage]);

  return (
    <nav ref={navRef} aria-label={title} css={stack.item}>
      <StackedOnly>
        <Heading level={headingLevel} look="h1">
          {title}
        </Heading>
      </StackedOnly>
      {reports.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted" css={sidebarEdge.text}>
          {t({
            en: "Reports are listed once the first one is written.",
            zh: "第一份晨报写好后就会列出。",
          })}
        </Text>
      ) : (
        <>
          <UnlessStacked>
            <NavList linkComponent={SplitViewLink}>
              {groupByMonth(reports).map(({ month, reports: inMonth }) => (
                <NavGroup key={month} label={formatMonth(month, dateLocale)}>
                  {inMonth.map((report) => (
                    <NavLink
                      key={report.localDate}
                      href={
                        report.localDate === newestDate
                          ? homeViewHref("report", locale)
                          : getLocalePath(
                              `/reports/${report.localDate}`,
                              locale,
                            )
                      }
                      current={report.localDate === currentDate}
                      trailing={
                        report.headline !== null ? null : (
                          <StatusDot
                            intent={
                              report.status === "no-mail"
                                ? "neutral"
                                : "warning"
                            }
                            label={
                              report.status === "no-mail" ? noMail : notWritten
                            }
                          />
                        )
                      }
                    >
                      <span css={typeModifier.numeric}>
                        {formatListDay(report.localDate, dateLocale)}
                      </span>
                    </NavLink>
                  ))}
                </NavGroup>
              ))}
            </NavList>
          </UnlessStacked>
          <StackedOnly>
            <div css={stack.item}>
              {groupByMonth(reports).map(({ month, reports: inMonth }) => (
                <section
                  key={month}
                  aria-label={formatMonth(month, dateLocale)}
                  css={[stack.tight, styles.month]}
                >
                  <Text look="overline" tone="muted">
                    {formatMonth(month, dateLocale)}
                  </Text>
                  <List>
                    {inMonth.map((report) => {
                      const isCurrent = report.localDate === currentDate;
                      return (
                        <ListRow
                          key={report.localDate}
                          href={
                            report.localDate === newestDate
                              ? homeViewHref("report", locale)
                              : getLocalePath(
                                  `/reports/${report.localDate}`,
                                  locale,
                                )
                          }
                          linkComponent={SplitViewLink}
                          aria-current={isCurrent ? "page" : undefined}
                          wrap
                          detail={
                            <span
                              css={[
                                typeModifier.lines(2),
                                typeModifier.verbatim,
                              ]}
                            >
                              {report.headline ??
                                (report.status === "no-mail"
                                  ? noMail
                                  : notWritten)}
                            </span>
                          }
                        >
                          <span css={typeModifier.numeric}>
                            {formatListDay(report.localDate, dateLocale)}
                          </span>
                        </ListRow>
                      );
                    })}
                  </List>
                </section>
              ))}
            </div>
          </StackedOnly>
        </>
      )}
    </nav>
  );
}

const styles = stylex.create({
  month: {
    paddingBlockStart: rhythm.tight,
  },
});
