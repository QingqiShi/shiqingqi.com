import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { color } from "../color.stylex.ts";
import { typeModifier } from "../primitives/type.stylex.ts";
import { border, font, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { alignStyles, styles as cellStyles } from "./table-cell.stylex.ts";
import type { TableCellAlignment } from "./table-cell.tsx";
import { tableMarker, tableTokens } from "./table.stylex.ts";

// The native `align` attribute on `<td>`/`<th>` is deprecated and
// presentational. The design system reuses the name for logical alignment.
interface TableHeaderCellProps
  extends
    Omit<ComponentProps<"th">, "align" | "scope" | "className" | "style">,
    TableCellAlignment {
  /**
   * Which cells this header labels: `"col"` for a column header in the head,
   * `"row"` for the label at the start of a body row. Required — a `<th>`
   * without it leaves the association to browser guesswork.
   *
   * @zh 这个标题为哪些单元格命名：`"col"` 用于表头中的列标题，`"row"` 用于主体行开头的标签。必填——缺少它的 `<th>` 只能让浏览器去猜测这层关联。
   */
  scope: "col" | "row" | "colgroup" | "rowgroup";
  /**
   * Sets the label of a row in from the start, by its depth in a tree of
   * rows: `1` for a row below a group, `2` for a row below that.
   *
   * @zh 按行在层级中的深度，把行标签从起始侧缩进：`1` 用于某一组之下的行，`2` 用于再下一层的行。
   */
  indent?: 1 | 2;
  /**
   * StyleX styles merged over the header cell's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在标题单元格自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** A `<th>`. Column headers read quiet, row headers read as the row's label. */
export function TableHeaderCell({
  scope,
  align,
  numeric = false,
  indent,
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
        cellStyles.cell,
        isRowHeader ? styles.rowHeaderCell : styles.columnHeaderCell,
        numeric && cellStyles.numeric,
        numeric && typeModifier.numeric,
        resolvedAlign ? alignStyles[resolvedAlign] : null,
        indent !== undefined && indentStyles[indent],
        css,
      ]}
    >
      {children}
    </th>
  );
}

const HEAD_RULE = `inset 0 calc(-1 * ${border.size_1}) 0 ${color.border}`;

/** `Table` sets this attribute while its first column sticks. */
const STICKY_COLUMN = ":is([data-sticky-column])";

const styles = stylex.create({
  // A shadow, not a border: browsers drop a stuck sticky head's collapsed
  // border, wherever declared, leaving nothing under it. An inset shadow
  // survives the stick; `forced-colors` drops shadows, so the border returns
  // there, where nothing sticky-paints anyway.
  columnHeaderCell: {
    fontWeight: font.weight_6,
    color: color.mutedForeground,
    // `calc`, not a bare minus: the token is a `var()`, and `-var(...)` is not
    // a valid length, so the declaration is dropped.
    boxShadow: {
      default: HEAD_RULE,
      ":first-child": {
        default: HEAD_RULE,
        [stylex.when.ancestor(STICKY_COLUMN, tableMarker)]:
          `${HEAD_RULE}, ${tableTokens.columnEdge}`,
      },
    },
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
      "@media (forced-colors: active)": color.border,
    },
  },
  rowHeaderCell: {
    fontWeight: tableTokens.rowHeaderWeight,
    color: color.foreground,
  },
});

const indentStyles = stylex.create({
  1: { paddingInlineStart: space._5 },
  2: { paddingInlineStart: space._7 },
});
