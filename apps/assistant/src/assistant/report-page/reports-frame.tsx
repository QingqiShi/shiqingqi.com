"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import type { ReportListItem } from "../report/read-report.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportList } from "./report-list.tsx";
import { ReportsIslands } from "./reports-islands.tsx";

interface ReportsFrameProps {
  reports: readonly ReportListItem[];
  /** The user's local date, `YYYY-MM-DD`. */
  today: string;
  children: ReactNode;
}

/**
 * The morning reports: the list of days beside the open report at `lg` and
 * wider, each in its own island. Below `lg`, `/reports` is the list alone,
 * and a report opens on its own with a way to the list.
 */
export function ReportsFrame({ reports, today, children }: ReportsFrameProps) {
  const segments = useSelectedLayoutSegments();
  const isWide = useIsWideLayout();
  const isOnList = segments.length === 1;
  const openDate = segments.at(1) ?? null;
  const latestDate = reports.at(0)?.localDate ?? null;
  const currentDate = openDate ?? (isOnList && isWide ? latestDate : null);

  return (
    <ReportsIslands
      isOnList={isOnList}
      reportKey={openDate ?? "latest"}
      list={
        <ReportList
          reports={reports}
          today={today}
          currentDate={currentDate}
          headingLevel={isOnList ? 1 : 2}
        />
      }
    >
      {children}
    </ReportsIslands>
  );
}
