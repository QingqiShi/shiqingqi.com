"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DetailPane } from "./detail-pane.tsx";
import { PaneSheet } from "./pane-sheet.tsx";
import { useIsWideLayout } from "./use-is-wide-layout.ts";
import { useUrlSelection } from "./use-url-selection.ts";

interface MasterDetailLayoutProps {
  /** The list. */
  master: ReactNode;
  /** What the URL selects; rendered in the pane at `lg+` and in a sheet below. */
  detail: ReactNode;
  /** Shown in the pane when nothing is selected, at `lg+` only. */
  empty?: ReactNode;
  /** The search param that carries the selection. */
  param?: string;
  /** Names the sheet below `lg`. */
  detailLabel: string;
}

/**
 * A list and the detail of its selected row: side by side at `lg` and wider,
 * the detail in a `PaneSheet` below. The selection lives in the URL
 * (`?id=` by default), so link rows with `useUrlSelection(param).hrefWith`.
 */
export function MasterDetailLayout({
  master,
  detail,
  empty,
  param = "id",
  detailLabel,
}: MasterDetailLayoutProps) {
  const selection = useUrlSelection(param);
  const isWide = useIsWideLayout();
  const isOpen = selection.value !== null;

  return (
    <div css={styles.root}>
      <div css={styles.master}>{master}</div>
      {isWide ? (
        <DetailPane label={detailLabel}>{isOpen ? detail : empty}</DetailPane>
      ) : (
        <PaneSheet
          isOpen={isOpen}
          onClose={selection.clear}
          label={detailLabel}
        >
          {detail}
        </PaneSheet>
      )}
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    gap: rhythm.group,
    alignItems: "start",
  },
  master: {
    minInlineSize: 0,
  },
});
