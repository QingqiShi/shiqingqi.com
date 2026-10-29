"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { FinanceQueryProvider } from "../queries/finance-query-provider.tsx";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import {
  FinanceIsland,
  FinanceIslands,
} from "../shell/finance-page-column.tsx";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { ReportList } from "./report-list.tsx";
import { useReportList } from "./use-report-list.ts";

/**
 * Reports: the list of weeks beside the open Report at `lg` and wider, each
 * in its own island. The list is as wide as its widest week, so no locale
 * cuts a week short, up to a width that still leaves the Report the most
 * room. Below `lg` the list is its own page and a Report opens on its own
 * with a way back.
 */
export function ReportsFrame({ children }: { children: ReactNode }) {
  return (
    <FinanceQueryProvider>
      <ReportsIslands>{children}</ReportsIslands>
      <NewTransactionSheet />
    </FinanceQueryProvider>
  );
}

function ReportsIslands({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isWide = useIsWideLayout();
  const newestId = useReportList().data?.at(0)?.id ?? null;
  const isOnReport = segment !== null;
  const currentId = segment ?? (isWide ? newestId : null);

  return (
    <FinanceIslands>
      <FinanceIsland
        accessory={isOnReport ? null : <FinanceAddButton />}
        css={[styles.list, isOnReport && styles.listOnReport]}
      >
        <ReportList currentId={currentId} headingLevel={isOnReport ? 2 : 1} />
      </FinanceIsland>
      {/* A new key opens each Report at the top of its island. */}
      <FinanceIsland
        key={currentId}
        accessory={isOnReport ? <FinanceAddButton /> : null}
        css={!isOnReport && styles.reportOnIndex}
      >
        <div css={styles.report}>{children}</div>
      </FinanceIsland>
    </FinanceIslands>
  );
}

const styles = stylex.create({
  list: {
    flexGrow: { default: 1, [breakpoints.lg]: 0 },
    flexShrink: { default: 1, [breakpoints.lg]: 0 },
    flexBasis: { default: 0, [breakpoints.lg]: "auto" },
    inlineSize: { default: null, [breakpoints.lg]: "max-content" },
    minInlineSize: { default: 0, [breakpoints.lg]: "19rem" },
    maxInlineSize: { default: null, [breakpoints.lg]: "25rem" },
  },
  listOnReport: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  report: {
    minInlineSize: 0,
    maxInlineSize: "84rem",
  },
  reportOnIndex: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
});
