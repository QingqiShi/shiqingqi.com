import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { TableScroller } from "./table-scroller.tsx";
import { tableMarker, tableTokens } from "./table.stylex.ts";

interface TableProps extends Omit<
  ComponentProps<"table">,
  "className" | "style"
> {
  /**
   * Names the table and its scroll region. Required — an unnamed table leaves
   * a screen reader announcing "table" and nothing else.
   *
   * @zh 为表格及其滚动区域命名。必填——未命名的表格会让读屏软件只宣读“表格”，别无其他。
   */
  caption: string;
  /**
   * Renders the `caption` above the table. It is `sr-only` by default.
   *
   * @zh 将 `caption` 显示在表格上方。默认仅供读屏使用。
   */
  captionVisible?: boolean;
  /**
   * Holds `TableHead` at the top of the scroll container while the rows move
   * under it. The container is what it sticks to, so give that a height
   * through `containerCss` or nothing will ever scroll past it.
   *
   * @zh 在各行从下方滚过时，将 `TableHead` 固定在滚动容器顶部。它固定的对象是容器，因此请通过 `containerCss` 为容器设定高度，否则不会有任何内容从表头下方滚过。
   */
  stickyHeader?: boolean;
  /**
   * Holds the first column at the start edge while the other columns scroll
   * sideways under it, so each row keeps its label in view. While they pass
   * under it, a line marks its edge in place of the blur at the start edge.
   * Its cells take an opaque fill, `tableTokens.stickyFill`, which is the
   * surface colour unless you set it.
   *
   * @zh 在其他列横向滚动、从其下方经过时，把第一列固定在起始边，让每一行的标签始终可见。其他列从其下方经过时，由一条线标出它的边缘，取代起始边的虚化。这一列的单元格使用不透明的填充 `tableTokens.stickyFill`，默认是表面颜色，可自行设置。
   */
  stickyColumn?: boolean;
  /**
   * Where each cell sets its content in the height of its row. `"top"` keeps
   * the first lines of a row on one line, for cells of wrapped text.
   * `"middle"` centres each cell, for a row that holds a control, such as a
   * `Select` or a `Button`, which is taller than a line of text.
   *
   * @default "top"
   *
   * @zh 每个单元格在行高内放置内容的位置。`"top"` 让一行中各单元格的首行对齐，适合换行的文字。`"middle"` 让每个单元格垂直居中，适合含有比一行文字更高的控件（如 `Select` 或 `Button`）的行。
   */
  verticalAlign?: "top" | "middle";
  /**
   * StyleX overrides for the scroll region's root, composed last — where a
   * height or a width cap goes.
   *
   * @zh 最后合成的滚动区域根元素 StyleX 覆盖样式——高度或宽度上限写在这里。
   */
  containerCss?: StyleProp;
  /**
   * StyleX styles merged over the scroller in the scroll region — inline
   * padding that keeps the table off the region's edges, for a region that
   * sits flush against its container's edge so the rows blur out there.
   *
   * @zh 合并在滚动区域内滚动元素上的 StyleX 样式——用行向内边距让表格离开区域的边缘。适用于紧贴容器边缘放置的区域，这样各行会在容器边缘处虚化淡出。
   */
  contentCss?: StyleProp;
  /**
   * The table's groups — `TableHead`, `TableBody`, `TableFoot`.
   *
   * @zh 表格的各个分组——`TableHead`、`TableBody`、`TableFoot`。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the table's own — the config-layer escape
   * hatch. The scroll region around it takes
   * `containerCss`.
   *
   * @zh 合并在表格自身样式之上的 StyleX 样式——配置层的逃生舱口。外层滚动区域请用 `containerCss`。
   */
  css?: StyleProp;
}

/**
 * A static, semantic data table inside its own horizontally scrolling region;
 * not a data grid, so sorting, virtualisation, resizing, and selection are
 * absent. `css` lands on the `<table>`, `containerCss` on the scroll region.
 */
export function Table({
  caption,
  captionVisible = false,
  stickyHeader = false,
  stickyColumn = false,
  verticalAlign = "top",
  containerCss,
  contentCss,
  css,
  ref,
  children,
  ...restProps
}: TableProps) {
  const captionId = useId();

  return (
    <TableScroller
      labelledBy={captionId}
      scrollsBlock={stickyHeader}
      stickyColumn={stickyColumn}
      containerCss={containerCss}
      contentCss={contentCss}
    >
      <table
        {...restProps}
        ref={ref}
        data-sticky-column={stickyColumn || undefined}
        css={[
          tableMarker,
          typeRole.bodySmall,
          styles.table,
          stickyHeader && styles.stickyHead,
          verticalAlign === "middle" && styles.middle,
          css,
        ]}
      >
        <caption
          id={captionId}
          css={[styles.caption, !captionVisible && a11y.srOnly]}
        >
          {caption}
        </caption>
        {children}
      </table>
    </TableScroller>
  );
}

export { TableHead } from "./table-head.tsx";
export { TableBody } from "./table-body.tsx";
export { TableFoot } from "./table-foot.tsx";
export { TableRow } from "./table-row.tsx";
export { TableHeaderCell } from "./table-header-cell.tsx";
export { TableCell } from "./table-cell.tsx";
export { TableDisclosure } from "./table-disclosure.tsx";
export { TableDisclosureTrigger } from "./table-disclosure-trigger.tsx";

const styles = stylex.create({
  // Re-stated here, not left to the token default: a nested plain table would
  // otherwise inherit the outer sticky table's head inset.
  table: {
    [tableTokens.headInset]: "auto",
    [tableTokens.headBackground]: "transparent",
    [tableTokens.cellAlignBlock]: "top",
    inlineSize: "100%",
    borderCollapse: "collapse",
    color: color.foreground,
  },
  stickyHead: {
    [tableTokens.headInset]: "0px",
    [tableTokens.headBackground]: color.card,
  },
  middle: {
    [tableTokens.cellAlignBlock]: "middle",
  },
  caption: {
    paddingBlockEnd: space._2,
    textAlign: "start",
    color: color.mutedForeground,
  },
});
