import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color, font } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { alignStyles, styles as cellStyles } from "./table-cell.stylex.ts";
import type { TableCellAlignment } from "./table-cell.tsx";

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
        resolvedAlign ? alignStyles[resolvedAlign] : null,
        css,
      ]}
    >
      {children}
    </th>
  );
}

const styles = stylex.create({
  // A shadow, not a border: browsers drop a stuck sticky head's collapsed
  // border, wherever declared, leaving nothing under it. An inset shadow
  // survives the stick; `forced-colors` drops shadows, so the border returns
  // there, where nothing sticky-paints anyway.
  columnHeaderCell: {
    fontWeight: font.weight_6,
    color: color.textMuted,
    // `calc`, not a bare minus: the token is a `var()`, and `-var(...)` is not
    // a valid length, so the declaration is dropped.
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
});
