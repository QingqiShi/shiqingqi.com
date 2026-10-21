"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { groupReportsByYear } from "./group-reports-by-year.ts";
import { lastCompleteWeekEnd } from "./last-complete-week-end.ts";
import { useRegenerateReport } from "./use-regenerate-report.ts";
import { useReportList } from "./use-report-list.ts";

const LOADING_ROWS = 5;

interface ReportListProps {
  /** The Report on screen, marked in the list. */
  currentId: string | null;
  headingLevel: 1 | 2;
}

/** Every weekly Report, newest first and split by year, with a way to make last week's. */
export function ReportList({ currentId, headingLevel }: ReportListProps) {
  const locale = useLocale();
  const router = useRouter();
  const list = useReportList();
  const reports = list.data ?? [];
  const today = useHouseholdToday();
  const lastWeekEnd = lastCompleteWeekEnd(today);
  const hasLastWeek = reports.some(
    (report) => report.periodEnd === lastWeekEnd,
  );
  const { regenerate, pending } = useRegenerateReport();
  const isWide = useIsWideLayout();
  const currentRef = useRef<HTMLElement>(null);
  const lastWeekLabel = t({ en: "Last week", zh: "上周" });

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  async function generateLastWeek() {
    const id = await regenerate();
    if (id !== null) {
      router.push(getLocalePath(`/finance/reports/${id}`, locale));
    }
  }

  const generateButton = (
    <Button
      size="sm"
      look={reports.length === 0 ? "primary" : undefined}
      icon={<ArrowClockwiseIcon weight="bold" />}
      loading={pending}
      onClick={() => {
        void generateLastWeek();
      }}
    >
      {t({ en: "Make last week's report", zh: "生成上周周报" })}
    </Button>
  );

  return (
    <nav aria-label={t({ en: "Reports", zh: "周报" })} css={stack.item}>
      <Heading level={headingLevel} look="h3">
        {t({ en: "Reports", zh: "周报" })}
      </Heading>
      {list.data === undefined &&
      list.status === "pending" &&
      list.fetchStatus !== "paused" ? (
        <List aria-busy>
          {Array.from({ length: LOADING_ROWS }, (_, index) => (
            <li key={index} css={listSurface.item}>
              <span css={listSurface.row}>
                <Skeleton width="8rem" height="1em" delay={index * 100} />
              </span>
            </li>
          ))}
        </List>
      ) : list.data === undefined ? (
        <Callout
          intent="warning"
          title={t({
            en: "The reports did not load",
            zh: "周报列表未能加载",
          })}
        >
          <div css={stack.tight}>
            <Text look="bodySmall">
              {t({
                en: "Reports come from the server, so this needs you to be online.",
                zh: "周报需从服务器读取，这里需要联网。",
              })}
            </Text>
            <div>
              <Button
                size="sm"
                look="outline"
                loading={list.isFetching}
                onClick={() => {
                  void list.refetch();
                }}
              >
                {t({ en: "Try again", zh: "重试" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : reports.length === 0 ? (
        <div css={stack.item}>
          <div css={stack.text}>
            <Text as="p" look="body">
              {t({ en: "No reports yet.", zh: "还没有周报。" })}
            </Text>
            <Text as="p" look="bodySmall" tone="muted">
              {t({
                en: "A report is made every Monday morning for the week before: net worth, every account by group, and what was spent.",
                zh: "每周一早上会为上一周生成一份周报：净资产、按分组列出的每个账户，以及这周的支出。",
              })}
            </Text>
          </div>
          <div>{generateButton}</div>
        </div>
      ) : (
        <>
          {hasLastWeek ? null : <div>{generateButton}</div>}
          {groupReportsByYear(reports).map(({ year, reports: inYear }) => (
            <section
              key={year}
              aria-label={year}
              css={[stack.tight, styles.year]}
            >
              <Text look="overline" tone="muted">
                {year}
              </Text>
              <List>
                {inYear.map((report) => {
                  const isCurrent = report.id === currentId;
                  return (
                    <ListRow
                      key={report.id}
                      ref={isCurrent ? currentRef : undefined}
                      href={getLocalePath(
                        `/finance/reports/${report.id}`,
                        locale,
                      )}
                      linkComponent={Link}
                      aria-current={isCurrent ? "page" : undefined}
                      caret={!isWide}
                      trailing={
                        report.periodEnd === lastWeekEnd ? (
                          <Badge intent="neutral" size="sm">
                            {lastWeekLabel}
                          </Badge>
                        ) : null
                      }
                    >
                      <span css={typeModifier.numeric}>
                        {formatReportWeek(
                          report.periodStart,
                          report.periodEnd,
                          locale,
                          { withYear: false },
                        )}
                      </span>
                    </ListRow>
                  );
                })}
              </List>
            </section>
          ))}
        </>
      )}
    </nav>
  );
}

const styles = stylex.create({
  year: {
    paddingBlockStart: rhythm.tight,
  },
});
