import type { ComponentProps } from "react";
import type { StyleProp } from "../../types.ts";
import { alignStyles, styles } from "./table-cell.stylex.ts";

export type TableCellAlign = "start" | "center" | "end";

export interface TableCellAlignment {
  /**
   * Text alignment. `numeric` end-aligns the cell on its own, and an explicit
   * `align` beats it.
   *
   * @default "start"
   *
   * @zh 文本对齐方式。`numeric` 本身会让单元格靠末端对齐，而显式传入的 `align` 优先于它。
   */
  align?: TableCellAlign;
  /**
   * Renders figures at a fixed width and end-aligns the cell, so a column of
   * numbers lines up digit for digit. Set it on the column's header too, or
   * the header drifts away from the numbers it labels.
   *
   * @zh 让数字以等宽呈现并使单元格靠末端对齐，使整列数字逐位对齐。请同时在该列的标题上设置它，否则标题会与其所标注的数字错位。
   */
  numeric?: boolean;
}

interface TableCellProps
  extends
    Omit<ComponentProps<"td">, "align" | "className" | "style">,
    TableCellAlignment {
  /**
   * StyleX styles merged over the cell's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在单元格自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

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
