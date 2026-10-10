"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { groupReportsByYear } from "./group-reports-by-year.ts";
import { lastCompleteWeekEnd } from "./last-complete-week-end.ts";
import { useRegenerateReport } from "./use-regenerate-report.ts";
import { useReportList } from "./use-report-list.ts";

const LOADING_ROWS = 5;
const WEEK_LINK_BLOCK_SIZE = "2.625rem";

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
  const currentRef = useRef<HTMLAnchorElement>(null);
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
        <div css={styles.list} aria-busy>
          {Array.from({ length: LOADING_ROWS }, (_, index) => (
            <Skeleton
              key={index}
              width="100%"
              height={WEEK_LINK_BLOCK_SIZE}
              delay={index * 100}
            />
          ))}
        </div>
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
          <div css={stack.tight}>
            <Text as="p" look="body">
              {t({ en: "No reports yet.", zh: "还没有周报。" })}
            </Text>
            <Text as="p" look="bodySmall" tone="muted">
              {t({
                en: "A report is made every Monday morning for the week before: net worth, every account by group, and what was spent.",
                zh: "每周一早上会为上一周生成一份周报：净资产、按分组列出的每个账户，以及这周的支出。",
              })}
            </Text>
            <Text as="p" look="bodySmall" tone="muted">
              {t(
                {
                  en: "To fill in the weeks before, run <strong>pnpm --filter web finance:reports:backfill</strong> once against this database.",
                  zh: "要补上之前的每一周，对这个数据库运行一次 <strong>pnpm --filter web finance:reports:backfill</strong>。",
                },
                { parse: true },
              )}
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
              <ul css={styles.list}>
                {inYear.map((report) => {
                  const isCurrent = report.id === currentId;
                  return (
                    <li key={report.id}>
                      <Link
                        ref={isCurrent ? currentRef : undefined}
                        href={getLocalePath(
                          `/finance/reports/${report.id}`,
                          locale,
                        )}
                        aria-current={isCurrent ? "page" : undefined}
                        {...stylex.props(
                          typeRole.label,
                          typeModifier.numeric,
                          corner.radius_2,
                          transition.colors,
                          selected.quiet,
                          a11y.focusRingInset,
                          styles.link,
                        )}
                      >
                        <span>
                          {formatReportWeek(
                            report.periodStart,
                            report.periodEnd,
                            locale,
                            { withYear: false },
                          )}
                        </span>
                        {report.periodEnd === lastWeekEnd ? (
                          <span css={[typeRole.caption, styles.muted]}>
                            {lastWeekLabel}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
  list: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  link: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._2,
    color: color.fg,
    fontWeight: font.weight_5,
    textDecoration: "none",
  },
  muted: {
    color: color.fgMuted,
  },
});
