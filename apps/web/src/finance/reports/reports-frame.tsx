"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { FinanceQueryProvider } from "../queries/finance-query-provider.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportList } from "./report-list.tsx";
import { useReportList } from "./use-report-list.ts";

/**
 * Reports: the list of weeks beside the open Report at `lg` and wider.
 * Below `lg` the list is its own page and a Report opens on its own with a
 * way back.
 */
export function ReportsFrame({ children }: { children: ReactNode }) {
  return (
    <FinanceQueryProvider>
      <ReportsColumns>{children}</ReportsColumns>
    </FinanceQueryProvider>
  );
}

function ReportsColumns({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isWide = useIsWideLayout();
  const newestId = useReportList().data?.at(0)?.id ?? null;
  const isOnReport = segment !== null;
  const currentId = segment ?? (isWide ? newestId : null);

  return (
    <div css={styles.root}>
      <div css={[styles.list, isOnReport && styles.listOnReport]}>
        <ReportList currentId={currentId} headingLevel={isOnReport ? 2 : 1} />
      </div>
      <div css={[styles.content, !isOnReport && styles.contentOnIndex]}>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "15rem minmax(0, 1fr)",
    },
    gap: rhythm.section,
    alignItems: "start",
  },
  list: {
    position: { default: "static", [breakpoints.lg]: "sticky" },
    insetBlockStart: space._4,
    maxBlockSize: {
      default: null,
      [breakpoints.lg]: `calc(100dvh - ${space._8})`,
    },
    overflowY: { default: null, [breakpoints.lg]: "auto" },
    paddingInlineEnd: { default: null, [breakpoints.lg]: space._2 },
    scrollbarColor: `${color.border} transparent`,
  },
  listOnReport: {
    display: { default: "none", [breakpoints.lg]: "block" },
  },
  content: {
    minInlineSize: 0,
    maxInlineSize: "56rem",
  },
  contentOnIndex: {
    display: { default: "none", [breakpoints.lg]: "block" },
  },
});
