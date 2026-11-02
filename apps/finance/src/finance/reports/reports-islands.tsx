"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import type { ReactNode } from "react";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import {
  FinanceIsland,
  FinanceIslands,
} from "../shell/finance-page-column.tsx";

interface ReportsIslandsProps {
  /** A page of one Report, which shows it alone below `lg`. Else the list shows alone there. */
  isOnReport: boolean;
  /** A new key opens each Report at the top of its island. */
  reportKey: string | null;
  list: ReactNode;
  children: ReactNode;
}

/**
 * The island of the list of weeks beside the island of the Report. The list
 * is as wide as its widest week, so no locale cuts a week short, up to a
 * width that still leaves the Report the most room.
 */
export function ReportsIslands({
  isOnReport,
  reportKey,
  list,
  children,
}: ReportsIslandsProps) {
  return (
    <FinanceIslands>
      <FinanceIsland
        accessory={isOnReport ? null : <FinanceAddButton />}
        css={[styles.list, isOnReport && styles.listOnReport]}
      >
        {list}
      </FinanceIsland>
      <FinanceIsland
        key={reportKey}
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
