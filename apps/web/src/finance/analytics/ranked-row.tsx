"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import type { ReactNode } from "react";
import { seriesKey } from "../charts/series-marks.stylex.ts";
import type { SeriesTone } from "../charts/series-tone-at.ts";

interface RankedRowProps {
  label: ReactNode;
  /** The amount, formatted. */
  value: string;
  /** Facts under the amount, such as the share and the change. */
  detail?: string;
  /** The row's share of the largest row, 0–1, drawn as a bar. */
  magnitude: number;
  /** The colour the row has in the chart above, if it has one. */
  tone?: SeriesTone;
  href?: string;
  onSelect?: () => void;
  isSelected?: boolean;
}

/**
 * One line of a ranked breakdown: a name, its amount, and a bar for its size
 * against the largest line. It links to a list, picks a Category, or only
 * reads.
 */
export function RankedRow({
  label,
  value,
  detail,
  magnitude,
  tone,
  href,
  onSelect,
  isSelected = false,
}: RankedRowProps) {
  const body = (
    <>
      <span css={styles.name}>
        {tone ? (
          <span aria-hidden css={[styles.swatch, seriesKey[tone]]} />
        ) : null}
        <span css={[typeRole.bodySmall, styles.label]}>{label}</span>
      </span>
      <span css={[typeRole.bodySmall, typeModifier.numeric, styles.value]}>
        {value}
      </span>
      <span css={[styles.track, !detail && styles.trackWide]} aria-hidden>
        <span
          css={[
            styles.bar,
            tone ? seriesKey[tone] : styles.neutralBar,
            styles.width(Math.max(Math.min(magnitude, 1), 0)),
          ]}
        />
      </span>
      {detail ? (
        <span css={[typeRole.caption, typeModifier.numeric, styles.detail]}>
          {detail}
        </span>
      ) : null}
    </>
  );
  const interactive = [
    corner.radius_2,
    transition.colors,
    selected.quiet,
    styles.row,
  ];

  return (
    <li>
      {href !== undefined ? (
        <Link
          href={href}
          {...stylex.props(interactive, a11y.focusRing, styles.link)}
        >
          {body}
        </Link>
      ) : onSelect ? (
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={onSelect}
          css={[buttonReset.base, interactive]}
        >
          {body}
        </button>
      ) : (
        <div css={styles.row}>{body}</div>
      )}
    </li>
  );
}

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: rhythm.item,
    rowGap: rhythm.inline,
    inlineSize: "100%",
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
    textAlign: "start",
  },
  link: {
    textDecoration: "none",
  },
  name: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    minInlineSize: 0,
  },
  swatch: {
    flexShrink: 0,
    inlineSize: space._2,
    blockSize: space._2,
    borderRadius: "2px",
    cornerShape: "round",
  },
  label: {
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  value: {
    fontWeight: font.weight_5,
    textAlign: "end",
  },
  track: {
    display: "block",
    blockSize: "4px",
    borderRadius: "2px",
    cornerShape: "round",
    backgroundColor: color.bgNeutralSubtle,
    overflow: "hidden",
  },
  trackWide: {
    gridColumn: "1 / -1",
  },
  bar: {
    display: "block",
    blockSize: "100%",
    borderRadius: "2px",
    cornerShape: "round",
  },
  neutralBar: {
    backgroundColor: `color-mix(in srgb, ${color.fgMuted} 60%, transparent)`,
  },
  width: (fraction: number) => ({
    inlineSize: `${String(fraction * 100)}%`,
  }),
  detail: {
    minInlineSize: "9rem",
    textAlign: "end",
    color: color.fgMuted,
  },
});
