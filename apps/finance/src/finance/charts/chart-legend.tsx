import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, row } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";

interface ChartLegendItem {
  label: string;
  /** The mark's colour, such as `chartMarks.primaryKey`. */
  keyStyle: StyleProp;
  /** A line key for a line series, a square for a bar or an area, a tick for a mark across a bar. */
  shape: "line" | "square" | "tick";
}

/** Names each series of a chart with two or more, keyed by the mark's own shape. */
export function ChartLegend({ items }: { items: readonly ChartLegendItem[] }) {
  return (
    <ul css={[cluster.item, styles.list]}>
      {items.map((item) => (
        <Text
          key={item.label}
          as="li"
          look="caption"
          tone="muted"
          css={row.tight}
        >
          <span aria-hidden css={[shapeKeys[item.shape], item.keyStyle]} />
          {item.label}
        </Text>
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
  tickKey: {
    display: "inline-block",
    inlineSize: "2px",
    blockSize: space._2,
  },
});

const shapeKeys = {
  line: styles.lineKey,
  square: styles.squareKey,
  tick: styles.tickKey,
};
