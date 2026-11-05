"use client";

import { Grid } from "@1771technologies/lytenyte-pro";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import { border, font, space } from "@tuja/ui/tokens.stylex";
import { copyTextToClipboard } from "@tuja/ui/utils/copy-text-to-clipboard";
import type { RefObject } from "react";
import type { MediaListItem } from "#src/movie-database/types.ts";
import { MediaRowNumberCell } from "./media-row-number-cell";
import { MediaRowNumberHeader } from "./media-row-number-header";
import { MediaTableHeader } from "./media-table-header";
import { toDelimitedCell } from "./to-delimited-cell";
import type { MediaColumn, MediaTableSpec } from "./types";

const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 44;
/** Distance from the bottom of the viewport that triggers the next page. */
const LOAD_MORE_THRESHOLD = ROW_HEIGHT * 8;

interface MediaTableGridProps {
  apiRef: RefObject<Grid.API<MediaTableSpec> | null>;
  resultsKey: string;
  rowSource: Grid.Props<MediaTableSpec>["rowSource"];
  columns: MediaColumn[];
  onColumnsChange: (next: MediaColumn[]) => void;
  onOpenRow: (media: MediaListItem) => void;
  onLoadMore: () => void;
}

export function MediaTableGrid({
  apiRef,
  resultsKey,
  rowSource,
  columns,
  onColumnsChange,
  onOpenRow,
  onLoadMore,
}: MediaTableGridProps) {
  const prefersReducedMotion = useReducedMotion();

  const events: Grid.Events<MediaTableSpec> = {
    cell: {
      doubleClick: ({ row, api }) => {
        if (api.rowIsLeaf(row)) onOpenRow(row.data);
      },
    },
    viewport: {
      scroll: ({ viewport }) => {
        const remaining =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        if (remaining < LOAD_MORE_THRESHOLD) onLoadMore();
      },
      keyDown: ({ event, api }) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        // `key` handles Caps Lock (`"C"`) and is the layout-correct answer
        // wherever the layout produces Latin letters. Only when it does not —
        // Cyrillic, Greek, Hebrew — fall back to the physical key. Checking
        // `code` unconditionally would swallow ⌘J on Dvorak, where the key in
        // the `KeyC` position types `j`.
        const isCopyKey =
          event.key.toLowerCase() === "c" ||
          (!/^[a-z]$/i.test(event.key) && event.code === "KeyC");
        if (!isCopyKey) return;
        const rect = api.cellSelections().at(0);
        if (!rect) return;
        // Take over from the browser: its native copy would run against an
        // empty DOM selection and leave the previous clipboard contents in
        // place, which pastes as stale data rather than as nothing.
        event.preventDefault();
        void api.exportData({ rect }).then(
          (exported) =>
            // Tab separated so a paste lands in spreadsheet cells, escaped the
            // same way as the CSV download — same free text, same spreadsheet.
            copyTextToClipboard(
              exported.data
                .map((row) =>
                  row.map((cell) => toDelimitedCell(cell, "\t")).join("\t"),
                )
                .join("\n"),
            ),
          // Nothing actionable to show from inside a key handler, but the
          // rejection must not surface as an unhandled promise.
          () => false,
        );
      },
    },
  };

  // LyteNyte Grid's own grid.css targets the literal class `ln-grid`, which has
  // to coexist with the compiled StyleX classes on the same element.
  const sx = stylex.props(styles.gridShell, styles.lyteNyteTheme);

  return (
    <div {...sx} className={`${sx.className ?? ""} ln-grid`}>
      <Grid<MediaTableSpec>
        // Remounting on a new result set is what returns the viewport
        // to the first row and clears stale cell selections.
        key={resultsKey}
        ref={apiRef}
        rowSource={rowSource}
        columns={columns}
        onColumnsChange={onColumnsChange}
        columnBase={{
          resizable: true,
          movable: true,
          headerRenderer: MediaTableHeader,
        }}
        columnMarker={{
          on: true,
          width: 52,
          cellRenderer: MediaRowNumberCell,
          headerRenderer: MediaRowNumberHeader,
        }}
        rowHeight={ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        rowAlternateAttr
        // LyteNyte does not obey reduced motion for row animations, so
        // the grid gets the setting as a prop.
        rowAnimate={!prefersReducedMotion}
        cellSelectionMode="range"
        cellSelectionExcludeMarker
        columnDoubleClickToAutosize
        suppressScrollFlash
        viewportInitialHeight={520}
        viewportInitialWidth={1140}
        events={events}
        styles={gridPartStyles}
      />
    </div>
  );
}

// The panel draws its own border, so the viewport's would double up.
const gridPartStyles: Grid.Style = {
  viewport: { style: { border: "none" } },
};

const styles = stylex.create({
  gridShell: {
    // Tall enough to feel like a workspace, short enough that the page scroll
    // still reaches the footer on a laptop.
    blockSize: {
      default: "60dvh",
      [breakpoints.md]: "calc(100dvh - 18rem)",
    },
    minBlockSize: "24rem",
  },
  lyteNyteTheme: {
    // LyteNyte reads a small set of custom properties; mapping them onto the
    // app's tokens is all the theming the grid needs. Every token below is a
    // `light-dark()` value, so the grid follows the site's colour scheme with
    // no theme class of its own.
    "--ln-typeface": font.family,
    "--ln-font-md": font.uiBodySmall,
    "--ln-padding-horizontal-cell": space._2,
    "--ln-radius-field-md": border.radius_2,
    "--ln-bg-ui-panel": color.bgSurface,
    "--ln-bg-row-alternate": color.bgSurfaceSunken,
    "--ln-bg-row-hover": color.bgAccentSubtle,
    "--ln-bg-button-light": color.bgControl,
    "--ln-border": color.border,
    "--ln-border-row": color.border,
    "--ln-border-strong": color.bgNeutral,
    "--ln-border-xstrong": color.bgNeutral,
    "--ln-text": color.fgMuted,
    "--ln-text-dark": color.fg,
    "--ln-primary-50": color.bgAccent,
    "--ln-primary-10": color.bgAccentSubtle,
    "--ln-red-50": color.bgDanger,
  },
});
