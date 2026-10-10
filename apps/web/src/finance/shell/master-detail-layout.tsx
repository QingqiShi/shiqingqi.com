"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
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
        <aside css={[corner.radius_4, styles.pane]} aria-label={detailLabel}>
          {isOpen ? detail : empty}
        </aside>
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
  pane: {
    position: "sticky",
    insetBlockStart: space._4,
    maxBlockSize: `calc(100dvh - ${space._8})`,
    overflowY: "auto",
    padding: space._5,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});
