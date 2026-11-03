"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { Link, LinkStatus } from "#src/links/link.tsx";
import { FinanceQueryProvider } from "../queries/finance-query-provider.tsx";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import { formatReportWeek } from "./format-report-week.ts";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportList } from "./report-list.tsx";
import { useReportList } from "./use-report-list.ts";

/**
 * Reports: the list of weeks beside the open Report where both fit, with the
 * newest Report open on `/reports`. Where they do not, `/reports` is the list,
 * and a Report opens over it with a way back.
 */
export function ReportsFrame({ children }: { children: ReactNode }) {
  return (
    <FinanceQueryProvider>
      <ReportsOfList>{children}</ReportsOfList>
      <NewTransactionSheet />
    </FinanceQueryProvider>
  );
}

function ReportsOfList({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const openId = useSelectedLayoutSegment();
  const reports = useReportList().data ?? [];
  const openReport = reports.find((report) => report.id === openId) ?? null;
  return (
    <ReportsColumns
      openId={openId}
      openLabel={
        openReport === null
          ? null
          : formatReportWeek(
              openReport.periodStart,
              openReport.periodEnd,
              locale,
            )
      }
      list={
        <ReportList
          currentId={openId ?? reports.at(0)?.id ?? null}
          headingLevel={openId === null ? 1 : 2}
        />
      }
    >
      {children}
    </ReportsColumns>
  );
}

interface ReportsColumnsProps {
  /** The Report that the URL opens, or null on `/reports`. */
  openId: string | null;
  /** The week of the open Report, where the list has it. */
  openLabel: string | null;
  list: ReactNode;
  children: ReactNode;
}

/** The columns of Reports, with no query, so that the skeleton can show them outside the query provider. */
export function ReportsColumns({
  openId,
  openLabel,
  list,
  children,
}: ReportsColumnsProps) {
  const locale = useLocale();
  const router = useRouter();
  const listHref = getLocalePath("/reports", locale);
  const listLabel = t({ en: "Reports", zh: "周报" });

  return (
    <NavigationSplitView
      linkComponent={Link}
      linkStatus={LinkStatus}
      skeleton={<ReportBodySkeleton />}
      css={pageColumn.report}
      replace={(href) => {
        router.replace(href);
      }}
      sidebar={{
        stacked: "page",
        href: listHref,
        label: listLabel,
        accessory: <FinanceAddButton />,
        node: list,
      }}
      content={{
        key: openId ?? "newest",
        label: openLabel ?? t({ en: "Weekly report", zh: "周报" }),
        back: openId === null ? null : { href: listHref, label: listLabel },
        accessory: <FinanceAddButton />,
        node: children,
      }}
    />
  );
}
