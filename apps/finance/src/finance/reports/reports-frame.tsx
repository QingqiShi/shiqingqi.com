"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { FinanceQueryProvider } from "../queries/finance-query-provider.tsx";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportList } from "./report-list.tsx";
import { ReportsIslands } from "./reports-islands.tsx";
import { useReportList } from "./use-report-list.ts";

/**
 * Reports: the list of weeks beside the open Report at `lg` and wider, each
 * in its own island. Below `lg` the list is its own page and a Report opens
 * on its own with a way back.
 */
export function ReportsFrame({ children }: { children: ReactNode }) {
  return (
    <FinanceQueryProvider>
      <CurrentReportIslands>{children}</CurrentReportIslands>
      <NewTransactionSheet />
    </FinanceQueryProvider>
  );
}

function CurrentReportIslands({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isWide = useIsWideLayout();
  const newestId = useReportList().data?.at(0)?.id ?? null;
  const isOnReport = segment !== null;
  const currentId = segment ?? (isWide ? newestId : null);

  return (
    <ReportsIslands
      isOnReport={isOnReport}
      reportKey={currentId}
      list={
        <ReportList currentId={currentId} headingLevel={isOnReport ? 2 : 1} />
      }
    >
      {children}
    </ReportsIslands>
  );
}
