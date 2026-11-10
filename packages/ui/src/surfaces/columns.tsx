import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import {
  containerWidth,
  sizeContainer,
} from "../primitives/size-container.stylex.ts";
import { rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface ColumnsProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The columns, in reading order: each child is one column. To stack
   * several cards in one column, wrap them in one element, such as a
   * `<div css={stack.group}>`.
   *
   * @zh 各列，按阅读顺序排列：每个子元素是一列。若要在一列中堆叠多张卡片，请把它们包在一个元素中，例如 `<div css={stack.group}>`。
   */
  children: ReactNode;
  /**
   * How the width is shared, first column first: `"2:1"` gives the main
   * column two thirds and an aside one third. Defaults to `"1:1"`.
   *
   * @zh 宽度的分配方式，从第一列开始：`"2:1"` 让主列占三分之二、侧栏占三分之一。默认为 `"1:1"`。
   */
  ratio?: "1:1" | "2:1" | "1:2" | "3:1" | "1:3" | "1:1:1";
  /**
   * The space between the columns, and between them where they stack.
   * `group`, the default, sets cards and sections apart. `item` is for
   * fields side by side, such as the filters above a table.
   *
   * @zh 各列之间的间距，也是各列堆叠时彼此之间的间距。默认的 `group` 用于分开卡片与分区。`item` 用于并排的字段，例如表格上方的筛选项。
   */
  gap?: "item" | "group";
  /**
   * StyleX styles merged over the outer box's own, such as a margin — the
   * config-layer escape hatch.
   *
   * @zh 合并在外层盒子自身样式之上的 StyleX 样式，例如外边距——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * Page content in columns side by side, which stack into one column, in
 * reading order, where the box is narrower than 44rem. It measures its own
 * width, not the screen's, so it works the same in a sidebar layout. The
 * columns start at the top and keep their own heights.
 */
export function Columns({
  children,
  ratio = "1:1",
  gap = "group",
  css,
  ...rest
}: ColumnsProps) {
  return (
    <div {...rest} css={[sizeContainer.inline, css]}>
      <div css={[styles.grid, gapStyles[gap], ratioStyles[ratio]]}>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    alignItems: "start",
  },
});

const gapStyles = stylex.create({
  item: { gap: rhythm.item },
  group: { gap: rhythm.group },
});

const ratioStyles = stylex.create({
  "1:1": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "repeat(2, minmax(0, 1fr))",
    },
  },
  "2:1": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "minmax(0, 2fr) minmax(0, 1fr)",
    },
  },
  "1:2": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "minmax(0, 1fr) minmax(0, 2fr)",
    },
  },
  "3:1": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "minmax(0, 3fr) minmax(0, 1fr)",
    },
  },
  "1:3": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "minmax(0, 1fr) minmax(0, 3fr)",
    },
  },
  "1:1:1": {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [containerWidth.columnsBeside]: "repeat(3, minmax(0, 1fr))",
    },
  },
});
