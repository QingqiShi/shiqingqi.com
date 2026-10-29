"use client";

import * as stylex from "@stylexjs/stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { chartMarks } from "../charts/chart-marks.stylex.ts";
import { layoutBars } from "./layout-bars.ts";

interface ReportBar {
  key: string;
  label: string;
  valueMinor: number;
  /** The value as shown at the end of the row. */
  value: string;
}

function percentOf(share: number) {
  return `${String(share * 100)}%`;
}

/** One row per value: its label, a bar either side of a shared zero, and the value. */
export function ReportBarList({ bars }: { bars: readonly ReportBar[] }) {
  const { zero, bars: extents } = layoutBars(bars.map((bar) => bar.valueMinor));
  return (
    <ul css={styles.list}>
      {bars.map((bar, index) => (
        <li key={bar.key} css={styles.row}>
          <span css={[typeRole.bodySmall, styles.name]}>{bar.label}</span>
          <span aria-hidden css={styles.track}>
            {zero > 0 && zero < 1 ? (
              <span css={[styles.zero, styles.at(percentOf(zero))]} />
            ) : null}
            <span
              css={[
                styles.bar,
                bar.valueMinor < 0
                  ? chartMarks.neutralKey
                  : chartMarks.primaryKey,
                styles.extent(
                  percentOf(extents[index].offset),
                  percentOf(extents[index].size),
                ),
              ]}
            />
          </span>
          <span css={[typeRole.bodySmall, typeModifier.numeric, styles.value]}>
            {bar.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    display: "grid",
    gridTemplateColumns: "minmax(0, max-content) minmax(4rem, 1fr) auto",
    columnGap: rhythm.item,
    rowGap: rhythm.tight,
    alignItems: "center",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  row: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "center",
  },
  name: {
    minInlineSize: 0,
    maxInlineSize: "10rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  track: {
    position: "relative",
    display: "block",
    blockSize: space._3,
  },
  zero: {
    position: "absolute",
    insetBlock: `calc(-1 * ${space._0})`,
    inlineSize: "1px",
    backgroundColor: color.fgMuted,
  },
  at: (offset: string) => ({
    insetInlineStart: offset,
  }),
  bar: {
    position: "absolute",
    insetBlock: 0,
    minInlineSize: "2px",
    borderRadius: "2px",
    cornerShape: "round",
  },
  extent: (offset: string, size: string) => ({
    insetInlineStart: offset,
    inlineSize: size,
  }),
  value: {
    fontWeight: font.weight_5,
    textAlign: "end",
  },
});
