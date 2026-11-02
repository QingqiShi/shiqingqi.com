"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import type { ReactNode } from "react";
import {
  AssistantIsland,
  AssistantIslands,
} from "../shell/assistant-page-column.tsx";

interface ReportsIslandsProps {
  /** `/reports`, which is the list alone below `lg`. */
  isOnList: boolean;
  /** A new key opens each report at the top of its island. */
  reportKey: string;
  list: ReactNode;
  children: ReactNode;
}

/** The island of the list beside the island of the report. */
export function ReportsIslands({
  isOnList,
  reportKey,
  list,
  children,
}: ReportsIslandsProps) {
  return (
    <AssistantIslands>
      <AssistantIsland css={[styles.list, !isOnList && styles.listOnReport]}>
        {list}
      </AssistantIsland>
      <AssistantIsland key={reportKey} css={isOnList && styles.reportOnList}>
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
