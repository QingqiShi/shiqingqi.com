import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { scrollbar, scrollX } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { border, color, font, layer, space } from "../tokens.stylex.ts";
import { tableTokens } from "./table.stylex.ts";

type TableCellAlign = "start" | "center" | "end";
type TableHeaderScope = "col" | "row" | "colgroup" | "rowgroup";

interface TableCellAlignment {
  /** Text alignment. Defaults to `"start"`, or `"end"` when `numeric`. */
  align?: TableCellAlign;
  /**
   * Renders figures at a fixed width and end-aligns the cell, so a column of
   * numbers lines up digit for digit. Set it on the column's header too.
   */
  numeric?: boolean;
}

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
 * A static, semantic data table: a real `<table>` inside its own horizontally
 * scrolling region, so a wide table scrolls in its own box and the page never
 * scrolls sideways. Sorting, virtualisation, column resizing and selection are
 * deliberately absent — that is a data grid, and a different component.
 *
 * The region is keyboard-reachable (WCAG 2.1.1) and named by the caption.
 * `css` lands on the `<table>`, `containerCss` on the scroll container, and
 * native `<table>` attributes plus `ref` forward to the table itself.
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

/** The `<thead>` group. Sticks when the root sets `stickyHeader`. */
export function TableHead({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"thead">, "className" | "style">) {
  return (
    <thead {...restProps} ref={ref} css={[styles.head, css]}>
      {children}
    </thead>
  );
}

/** The `<tbody>` group holding the table's rows. */
export function TableBody({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"tbody">, "className" | "style">) {
  return (
    <tbody {...restProps} ref={ref} css={css}>
      {children}
    </tbody>
  );
}

/** The `<tfoot>` group, for totals and summary rows. */
export function TableFoot({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"tfoot">, "className" | "style">) {
  return (
    <tfoot {...restProps} ref={ref} css={[styles.foot, css]}>
      {children}
    </tfoot>
  );
}

interface TableRowProps extends Omit<
  ComponentProps<"tr">,
  "className" | "style"
> {
  /**
   * Marks the row the visitor is on — the plan whose page they are reading,
   * say. Carries `aria-current` alongside the tint and the heavier type, so
   * the state never rests on colour alone. Pass `aria-current` yourself to
   * announce it as something other than `"true"`.
   */
  current?: boolean;
}

/** One `<tr>`, seamed off the row above it. */
export function TableRow({
  current = false,
  css,
  ref,
  children,
  "aria-current": ariaCurrent,
  ...restProps
}: TableRowProps) {
  return (
    <tr
      {...restProps}
      ref={ref}
      aria-current={ariaCurrent ?? (current ? "true" : undefined)}
      css={[styles.row, current && styles.currentRow, css]}
    >
      {children}
    </tr>
  );
}

// The native `align` attribute on `<td>`/`<th>` is a deprecated presentational
// one; the design system reuses the name for its logical alignment, so the
// native one goes.
interface TableHeaderCellProps
  extends
    Omit<ComponentProps<"th">, "align" | "scope" | "className" | "style">,
    TableCellAlignment {
  /**
   * Which cells this header labels: `"col"` for a column header in the head,
   * `"row"` for the label at the start of a body row. Required — a `<th>`
   * without it leaves the association to browser guesswork.
   */
  scope: TableHeaderScope;
}

/** A `<th>`. Column headers read quiet, row headers read as the row's label. */
export function TableHeaderCell({
  scope,
  align,
  numeric = false,
  css,
  ref,
  children,
  ...restProps
}: TableHeaderCellProps) {
  const resolvedAlign = align ?? (numeric ? "end" : undefined);
  const isRowHeader = scope === "row" || scope === "rowgroup";

  return (
    <th
      {...restProps}
      ref={ref}
      scope={scope}
      css={[
        styles.cell,
        isRowHeader ? styles.rowHeaderCell : styles.columnHeaderCell,
        numeric && styles.numeric,
        resolvedAlign ? alignStyles[resolvedAlign] : null,
        css,
      ]}
    >
      {children}
    </th>
  );
}

interface TableCellProps
  extends
    Omit<ComponentProps<"td">, "align" | "className" | "style">,
    TableCellAlignment {}

/** A `<td>` holding one value. */
export function TableCell({
  align,
  numeric = false,
  css,
  ref,
  children,
  ...restProps
}: TableCellProps) {
  const resolvedAlign = align ?? (numeric ? "end" : undefined);

  return (
    <td
      {...restProps}
      ref={ref}
      css={[
        styles.cell,
        numeric && styles.numeric,
        resolvedAlign ? alignStyles[resolvedAlign] : null,
        css,
      ]}
    >
      {children}
    </td>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: "100%",
    minInlineSize: 0,
  },
  // Re-stated on every table, not left to the token defaults: a plain table
  // nested inside a sticky-head one would otherwise inherit its head inset.
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
  head: {
    position: "sticky",
    insetBlockStart: tableTokens.headInset,
    zIndex: layer.content,
    backgroundColor: tableTokens.headBackground,
  },
  foot: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
  // Leading edge, so the last row of a group carries no trailing rule. `none`
  // rather than a transparent colour on the first row: in the collapsed model a
  // row outranks its group, so transparent would erase the group's own divide.
  row: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: { default: "solid", ":first-child": "none" },
    borderBlockStartColor: color.neutralBorder,
  },
  currentRow: {
    backgroundColor: color.surfaceAccentSubtle,
    fontWeight: font.weight_6,
  },
  cell: {
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    verticalAlign: "top",
  },
  // A shadow, not a border: in the collapsed model a browser drops a stuck
  // sticky head's collapsed border wherever it is declared — thead, tr or th —
  // so the head arrives over the scrolling rows with nothing under it. An inset
  // shadow is painted normally and survives the stick. `forced-colors` drops
  // shadows, so the border comes back there, where nothing is sticky-painted
  // anyway.
  columnHeaderCell: {
    fontWeight: font.weight_6,
    color: color.textMuted,
    // `calc`, not a bare minus: the token is a `var()`, and `-var(…)` is not a
    // length — the whole declaration parses as invalid and is dropped.
    boxShadow: `inset 0 calc(-1 * ${border.size_1}) 0 ${color.neutralBorder}`,
    borderBlockEndWidth: {
      default: null,
      "@media (forced-colors: active)": border.size_1,
    },
    borderBlockEndStyle: {
      default: null,
      "@media (forced-colors: active)": "solid",
    },
    borderBlockEndColor: {
      default: null,
      "@media (forced-colors: active)": color.neutralBorder,
    },
  },
  rowHeaderCell: {
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  numeric: {
    fontVariantNumeric: "tabular-nums",
  },
});

const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});
