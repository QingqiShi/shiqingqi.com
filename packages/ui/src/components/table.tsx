import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { color, font, space } from "../tokens.stylex.ts";
import { tableTokens } from "./table.stylex.ts";

interface TableProps extends Omit<
  ComponentProps<"table">,
  "className" | "style"
> {
  /**
   * Names the table and its scroll region. Required — an unnamed table leaves
   * a screen reader announcing "table" and nothing else.
   */
  caption: string;
  /** Renders the caption above the table. It is `sr-only` by default. */
  captionVisible?: boolean;
  /**
   * Holds `TableHead` at the top of the scroll container while the rows move
   * under it. The container is what it sticks to, so give that a height
   * through `containerCss` or nothing will ever scroll past it.
   */
  stickyHeader?: boolean;
  /** StyleX overrides for the scroll container, composed last. */
  containerCss?: StyleProp;
  /** The table's groups — `TableHead`, `TableBody`, `TableFoot`. */
  children: ReactNode;
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
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      css={[
        scrollX.base,
        scrollX.focusRing,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.container,
        containerCss,
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
    </div>
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
    minInlineSize: 0,
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
    color: color.textMain,
  },
  stickyHead: {
    [tableTokens.headInset]: "0px",
    [tableTokens.headBackground]: color.bgSurface,
  },
  caption: {
    paddingBlockEnd: space._2,
    textAlign: "start",
    color: color.textMuted,
  },
});
