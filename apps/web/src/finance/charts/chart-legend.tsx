import * as stylex from "@stylexjs/stylex";
import { cluster, row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";

interface ChartLegendItem {
  label: string;
  /** The mark's colour, such as `chartMarks.primaryKey`. */
  keyStyle: StyleProp;
  /** A line key for a line series, a square for a bar or an area. */
  shape: "line" | "square";
}

/** Names each series of a chart with two or more, keyed by the mark's own shape. */
export function ChartLegend({ items }: { items: readonly ChartLegendItem[] }) {
  return (
    <ul css={[cluster.item, styles.list]}>
      {items.map((item) => (
        <li key={item.label} css={[row.tight, typeRole.caption, styles.item]}>
          <span
            aria-hidden
            css={[
              item.shape === "line" ? styles.lineKey : styles.squareKey,
              item.keyStyle,
            ]}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    color: color.fgMuted,
  },
  lineKey: {
    display: "inline-block",
    inlineSize: space._3,
    blockSize: "2px",
  },
  squareKey: {
    display: "inline-block",
    inlineSize: space._1,
    blockSize: space._1,
  },
});
