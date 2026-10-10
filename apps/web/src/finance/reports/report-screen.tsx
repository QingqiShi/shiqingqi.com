"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { reportQuery } from "../queries/report-query.ts";
import { adjacentReports } from "./adjacent-reports.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { ReportBackLink } from "./report-back-link.tsx";
import { ReportView } from "./report-view.tsx";
import { useReportList } from "./use-report-list.ts";

interface ReportScreenProps {
  id: string;
  headingLevel: 1 | 2;
}

/** One Report: its data is read from the server when it opens, and the weeks either side are read ahead. */
export function ReportScreen({ id, headingLevel }: ReportScreenProps) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const reports = useReportList().data ?? [];
  const row = reports.find((report) => report.id === id) ?? null;
  const { older, newer } = adjacentReports(reports, id);
  const query = useQuery(reportQuery(id));
  const hasData = query.data !== undefined;

  useEffect(() => {
    if (!hasData) return;
    for (const report of [older, newer]) {
      if (report !== null) {
        queryClient.query(reportQuery(report.id)).catch(() => undefined);
      }
    }
  }, [hasData, older, newer, queryClient]);

  if (query.data !== undefined) {
    return (
      <ReportView
        report={query.data}
        headingLevel={headingLevel}
        older={older}
        newer={newer}
      />
    );
  }

  const title =
    row === null
      ? t({ en: "Weekly report", zh: "周报" })
      : formatReportWeek(row.periodStart, row.periodEnd, locale);

  if (query.status === "error" || query.fetchStatus === "paused") {
    const notFound =
      query.error instanceof FinanceApiError && query.error.status === 404;
    return (
      <div css={stack.group}>
        <ReportBackLink />
        <div css={stack.item}>
          <Heading level={headingLevel} look="h3">
            {title}
          </Heading>
          <Text as="p" look="body">
            {notFound
              ? t({
                  en: "This report does not exist, or it belongs to another household.",
                  zh: "这份周报不存在，或属于另一个家庭。",
                })
              : t({
                  en: "The report could not load. Reports come from the server, so check you are online, then try again.",
                  zh: "周报未能加载。周报需从服务器读取，请确认已联网后重试。",
                })}
          </Text>
          {notFound ? null : (
            <div>
              <Button
                size="sm"
                icon={<ArrowClockwiseIcon weight="bold" />}
                loading={query.isFetching}
                onClick={() => {
                  void query.refetch();
                }}
              >
                {t({ en: "Try again", zh: "重试" })}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div css={stack.group} aria-busy>
      <ReportBackLink />
      <div css={stack.item}>
        <Heading level={headingLevel} look="h3">
          {title}
        </Heading>
        <Skeleton width="60%" height="3rem" />
        <Skeleton width="100%" height="14rem" delay={100} />
        <Skeleton width="100%" height="20rem" delay={200} />
      </div>
    </div>
  );
}
