"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";
import type { ReportListItem } from "../report/read-report.ts";
import {
  AssistantIsland,
  AssistantIslands,
} from "../shell/assistant-page-column.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportList } from "./report-list.tsx";

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
  const currentDate = openDate ?? (isOnList && !isWide ? null : latestDate);

  return (
    <AssistantIslands>
      <AssistantIsland css={[styles.list, !isOnList && styles.listOnReport]}>
        <ReportList
          reports={reports}
          today={today}
          currentDate={currentDate}
          headingLevel={isOnList ? 1 : 2}
        />
      </AssistantIsland>
      {/* A new key opens each report at the top of its island. */}
      <AssistantIsland
        key={openDate ?? "latest"}
        css={isOnList && styles.reportOnList}
      >
        <div css={styles.report}>{children}</div>
      </AssistantIsland>
    </AssistantIslands>
  );
}

const styles = stylex.create({
  list: {
    flexGrow: { default: 1, [breakpoints.lg]: 0 },
    flexShrink: { default: 1, [breakpoints.lg]: 0 },
    flexBasis: { default: 0, [breakpoints.lg]: "auto" },
    inlineSize: { default: null, [breakpoints.lg]: "19rem" },
    minInlineSize: 0,
  },
  listOnReport: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  report: {
    minInlineSize: 0,
    maxInlineSize: "84rem",
  },
  reportOnList: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
});
