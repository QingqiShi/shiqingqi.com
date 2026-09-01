"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { t } from "#src/i18n.ts";
import { useMediaTable } from "../media-table-context";
import type { MediaHeaderParams } from "../media-table-spec";

/**
 * Mirrors the sort state onto the element that owns `role="columnheader"`.
 *
 * That element is LyteNyte's header cell, not anything we render, and the grid
 * never sets `aria-sort` itself — but `aria-sort` is only meaningful there, so
 * a screen reader reading the table has nowhere else to learn which column is
 * sorted. Returns a ref to attach to whatever the renderer puts inside.
 */
function useAriaSort<T extends HTMLElement>(
  value: "ascending" | "descending" | "none" | null,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (value === null) return undefined;
    const header = ref.current?.closest('[role="columnheader"]');
    if (!header) return undefined;
    header.setAttribute("aria-sort", value);
    return () => {
      header.removeAttribute("aria-sort");
    };
  }, [value]);

  return ref;
}

/**
 * Sortable column header. The whole header is a button so the sort cycle is
 * reachable by keyboard; the state is spelled out for screen readers because
 * the caret alone carries the meaning visually.
 */
export function MediaTableHeader({ column }: MediaHeaderParams) {
  const { toggleSort } = useMediaTable();
  const label = column.name ?? column.id;

  const ascendingLabel = t({ en: "sorted ascending", zh: "升序排列" });
  const descendingLabel = t({ en: "sorted descending", zh: "降序排列" });

  // `null` rather than `"none"` for a column that cannot be sorted: the
  // attribute's presence is itself the claim that sorting is available.
  const headerRef = useAriaSort<HTMLButtonElement>(
    column.unsortable
      ? null
      : column.sort === "asc"
        ? "ascending"
        : column.sort === "desc"
          ? "descending"
          : "none",
  );

  if (column.unsortable) {
    return <span css={[styles.headerLabel, truncate.base]}>{label}</span>;
  }

  const isNumeric = column.type === "number";

  return (
    <button
      ref={headerRef}
      type="button"
      css={[
        buttonReset.base,
        styles.headerButton,
        isNumeric && styles.headerButtonNumeric,
        !!column.sort && styles.headerButtonActive,
      ]}
      onClick={() => {
        toggleSort(column.id);
      }}
    >
      <span css={[styles.headerLabel, truncate.base]}>{label}</span>
      <span css={[styles.headerIcon, !!column.sort && styles.headerIconActive]}>
        {column.sort === "asc" ? (
          <ArrowUpIcon weight="bold" />
        ) : column.sort === "desc" ? (
          <ArrowDownIcon weight="bold" />
        ) : (
          <ArrowsDownUpIcon weight="bold" />
        )}
      </span>
      {column.sort && (
        <span css={a11y.srOnly}>
          {column.sort === "asc" ? ascendingLabel : descendingLabel}
        </span>
      )}
    </button>
  );
}

const styles = stylex.create({
  headerButton: {
    display: "flex",
    alignItems: "center",
    gap: space._0,
    inlineSize: "100%",
    blockSize: "100%",
    minInlineSize: 0,
    color: {
      default: "inherit",
      ":hover": color.textMain,
    },
    cursor: "pointer",
  },
  headerButtonNumeric: {
    justifyContent: "flex-end",
  },
  headerButtonActive: {
    color: color.accentText,
  },
  headerLabel: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  headerIcon: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    // Kept visible but recessive: every sortable header advertises the
    // affordance without the column labels turning into a row of arrows.
    opacity: 0.35,
    transitionProperty: "opacity",
    transitionDuration: "150ms",
  },
  headerIconActive: {
    opacity: 1,
  },
});
