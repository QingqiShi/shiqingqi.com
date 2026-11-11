"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { ListRow } from "@tuja/ui/components/list-row";
import { TabViewLink } from "@tuja/ui/components/tab-view";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { chartMarks } from "../charts/chart-marks.stylex.ts";
import { seriesKey } from "../charts/series-marks.stylex.ts";
import type { SeriesTone } from "../charts/series-tone-at.ts";

interface RankedRowProps {
  label: ReactNode;
  /** The amount, formatted. */
  value: string;
  /** Facts under the amount, such as the share and the change. */
  detail?: ReactNode;
  /** The row's share of the largest row, 0–1, drawn as a bar. */
  magnitude: number;
  /** A level on the same scale as `magnitude`, drawn as a mark across the track, such as an average. */
  mark?: number;
  /** The colour the row has in the chart above, if it has one. */
  tone?: SeriesTone;
  href?: string;
  onSelect?: () => void;
  isSelected?: boolean;
}

/**
 * One line of a ranked breakdown, a row of a list: a name, its amount, and a
 * bar for its size against the largest line. It links to a list, picks a
 * Category, or only reads.
 */
export function RankedRow({
  label,
  value,
  detail,
  magnitude,
  mark,
  tone,
  href,
  onSelect,
  isSelected = false,
}: RankedRowProps) {
  const bar = (
    <span aria-hidden css={styles.trackBox}>
      <span css={styles.track}>
        <span
          css={[
            styles.bar,
            tone ? seriesKey[tone] : chartMarks.neutralKey,
            styles.width(Math.max(Math.min(magnitude, 1), 0)),
          ]}
        />
        {mark === undefined || mark <= 0 ? null : (
          <span
            css={[
              styles.mark,
              chartMarks.referenceKey,
              styles.at(Math.min(mark, 1)),
            ]}
          />
        )}
      </span>
    </span>
  );
  const name = tone ? (
    <span css={styles.name}>
      <span aria-hidden css={[styles.swatch, seriesKey[tone]]} />
      <span css={styles.label}>{label}</span>
    </span>
  ) : (
    label
  );
  const parts = {
    caret: false,
    detail: bar,
    value,
    valueDetail: detail ? <span css={styles.detail}>{detail}</span> : null,
  };

  if (href !== undefined) {
    return (
      <ListRow {...parts} href={href} linkComponent={TabViewLink}>
        {name}
      </ListRow>
    );
  }
  if (onSelect) {
    return (
      <ListRow {...parts} onClick={onSelect} aria-pressed={isSelected}>
        {name}
      </ListRow>
    );
  }
  return <ListRow {...parts}>{name}</ListRow>;
}

const styles = stylex.create({
  // The swatch is part of the name and not the row's leading item, so that it
  // stays on the name line and the bar starts under it.
  name: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
  },
  // The swatch has no baseline, so the label gives the name its baseline.
  label: {
    alignSelf: "baseline",
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  swatch: {
    flexShrink: 0,
    inlineSize: space._2,
    blockSize: space._2,
    borderRadius: "2px",
    cornerShape: "round",
  },
  // The detail line clips what overflows it, so the box holds the mark that
  // reaches over the track.
  trackBox: {
    display: "block",
    paddingBlock: space._0,
  },
  track: {
    position: "relative",
    display: "block",
    blockSize: "4px",
    borderRadius: "2px",
    cornerShape: "round",
    backgroundColor: color.secondary,
  },
  bar: {
    display: "block",
    blockSize: "100%",
    borderRadius: "2px",
    cornerShape: "round",
  },
  width: (fraction: number) => ({
    inlineSize: `${String(fraction * 100)}%`,
  }),
  mark: {
    position: "absolute",
    insetBlock: `calc(-1 * ${space._0})`,
    inlineSize: "2px",
    marginInlineStart: "-1px",
  },
  at: (fraction: number) => ({
    insetInlineStart: `${String(fraction * 100)}%`,
  }),
  // The facts take one width in every row, so that the tracks of a list are
  // one length and their bars compare.
  detail: {
    display: "inline-block",
    minInlineSize: "9rem",
    textAlign: "end",
  },
});
