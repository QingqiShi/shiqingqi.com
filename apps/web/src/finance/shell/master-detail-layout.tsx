"use client";

import * as stylex from "@stylexjs/stylex";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import type { ReactNode } from "react";
import { MasterDetailColumns } from "./master-detail-columns.tsx";
import { masterDetailTokens } from "./master-detail.stylex.ts";
import { PaneSheet } from "./pane-sheet.tsx";
import { useIsWideLayout } from "./use-is-wide-layout.ts";
import { useUrlSelection } from "./use-url-selection.ts";

interface MasterDetailLayoutProps {
  /** The list. */
  master: ReactNode;
  /** Changes when the list shows another view, such as a reorder mode: the list then starts at the top. */
  masterKey?: string;
  /** What the URL selects; rendered in the pane at `lg+` and in a sheet below. */
  detail: ReactNode;
  /** Shown in the pane when nothing is selected, at `lg+` only. */
  empty?: ReactNode;
  /** The search param that carries the selection. */
  param: string;
  /** Names the sheet below `lg`. */
  detailLabel: string;
}

/**
 * A list and the detail of its selected row: side by side at `lg` and wider,
 * each in its own scroll box (`MasterDetailColumns`), and the detail in a
 * `PaneSheet` below. The list stops at a width that reads well, and the pane
 * takes the rest of the width and the height of the screen. When the
 * selection changes, the old content of the pane fades out before the new
 * content fades in. The selection lives in the `param` search param, so link
 * rows with `useUrlSelection(param).hrefWith` and `linkProps`.
 */
export function MasterDetailLayout({
  master,
  masterKey,
  detail,
  empty,
  param,
  detailLabel,
}: MasterDetailLayoutProps) {
  const selection = useUrlSelection(param);
  const isWide = useIsWideLayout();
  const isOpen = selection.value !== null;

  if (!isWide) {
    return (
      <div css={styles.narrow}>
        {master}
        <PaneSheet
          isOpen={isOpen}
          onClose={selection.clear}
          label={detailLabel}
        >
          {detail}
        </PaneSheet>
      </div>
    );
  }

  return (
    <MasterDetailColumns
      master={master}
      masterKey={masterKey}
      detailLabel={detailLabel}
      detailKey={selection.value}
      fillPane
      css={styles.columns}
    >
      <div css={[flex.col, grow._1]}>{isOpen ? detail : empty}</div>
    </MasterDetailColumns>
  );
}

const styles = stylex.create({
  narrow: {
    minInlineSize: 0,
  },
  columns: {
    gridTemplateColumns: masterDetailTokens.columns,
  },
});
