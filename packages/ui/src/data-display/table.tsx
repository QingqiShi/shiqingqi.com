import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import { color, font, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { tableTokens } from "./table.stylex.ts";

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
   * StyleX overrides for the scroll region's root, composed last — where a
   * height or a width cap goes.
   *
   * @zh 最后合成的滚动区域根元素 StyleX 覆盖样式——高度或宽度上限写在这里。
   */
  containerCss?: StyleProp;
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
  containerCss,
  css,
  ref,
  children,
  ...restProps
}: TableProps) {
  const captionId = useId();

  return (
    <ScrollMask
      orientation="horizontal"
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      css={[corner.radius_2, styles.container, containerCss]}
      contentCss={[
        scrollX.base,
        scrollX.focusRing,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
        stickyHeader && styles.scrollBlock,
      ]}
    >
      <table
        {...restProps}
        ref={ref}
        css={[styles.table, stickyHeader && styles.stickyHead, css]}
      >
        <caption
          id={captionId}
          css={[styles.caption, !captionVisible && a11y.srOnly]}
        >
          {caption}
        </caption>
        {children}
      </table>
    </ScrollMask>
  );
}

export { TableHead } from "./table-head.tsx";
export { TableBody } from "./table-body.tsx";
export { TableFoot } from "./table-foot.tsx";
export { TableRow } from "./table-row.tsx";
export { TableHeaderCell } from "./table-header-cell.tsx";
export { TableCell } from "./table-cell.tsx";

const styles = stylex.create({
  container: {
    maxInlineSize: "100%",
  },
  // The head is always positioned and raised over the rows. The scroller keeps
  // that raise inside itself, so the Scroll mask blurs the head too.
  scroller: {
    isolation: "isolate",
  },
  // A sticky head sticks to the scroller, so the rows have to scroll there.
  scrollBlock: {
    overflowY: "auto",
  },
  // Re-stated here, not left to the token default: a nested plain table would
  // otherwise inherit the outer sticky table's head inset.
  table: {
    [tableTokens.headInset]: "auto",
    [tableTokens.headBackground]: "transparent",
    inlineSize: "100%",
    borderCollapse: "collapse",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.fg,
  },
  stickyHead: {
    [tableTokens.headInset]: "0px",
    [tableTokens.headBackground]: color.bgSurface,
  },
  caption: {
    paddingBlockEnd: space._2,
    textAlign: "start",
    color: color.fgMuted,
  },
});
