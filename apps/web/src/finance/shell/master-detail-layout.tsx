"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { ViewTransition, type ReactNode } from "react";
import { DetailPane } from "./detail-pane.tsx";
import { masterDetailTokens } from "./master-detail.stylex.ts";
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
  param: string;
  /** Names the sheet below `lg`. */
  detailLabel: string;
}

/**
 * A list and the detail of its selected row: side by side at `lg` and wider,
 * the detail in a `PaneSheet` below. The list stops at a width that reads
 * well, and the pane takes the rest of the width and the height of the
 * screen. When the selection changes, the old content of the pane fades out
 * before the new content fades in. The selection lives in the `param` search
 * param, so link rows with `useUrlSelection(param).hrefWith`.
 */
export function MasterDetailLayout({
  master,
  detail,
  empty,
  param,
  detailLabel,
}: MasterDetailLayoutProps) {
  const selection = useUrlSelection(param);
  const isWide = useIsWideLayout();
  const isOpen = selection.value !== null;

  return (
    <div css={styles.root}>
      <div css={styles.master}>{master}</div>
      {isWide ? (
        <DetailPane label={detailLabel} css={styles.pane}>
          <ViewTransition
            key={selection.value}
            enter="master-detail-swap"
            exit="master-detail-swap"
            default="none"
          >
            <div css={[flex.col, grow._1]}>{isOpen ? detail : empty}</div>
          </ViewTransition>
        </DetailPane>
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
      [breakpoints.lg]: masterDetailTokens.columns,
    },
    gap: rhythm.group,
    alignItems: "start",
  },
  master: {
    minInlineSize: 0,
  },
  pane: {
    blockSize: masterDetailTokens.paneBlockSize,
  },
});
