import type { ComponentProps } from "react";
import { typeModifier } from "../primitives/type.stylex.ts";
import type { StyleProp } from "../types.ts";
import { alignStyles, styles } from "./table-cell.stylex.ts";

export interface TableCellAlignment {
  /**
   * Text alignment. `numeric` end-aligns the cell on its own, and an explicit
   * `align` beats it.
   *
   * @default "start"
   *
   * @zh 文本对齐方式。`numeric` 本身会让单元格靠末端对齐，而显式传入的 `align` 优先于它。
   */
  align?: "start" | "center" | "end";
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
   * `"muted"` quiets a value that matters less than the others in its row,
   * such as a change of zero.
   *
   * @zh `"muted"` 让一行中不如其他值重要的值安静下来，例如为零的变化。
   */
  tone?: "muted";
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
  tone,
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
        numeric && typeModifier.numeric,
        resolvedAlign ? alignStyles[resolvedAlign] : null,
        tone === "muted" && styles.muted,
        css,
      ]}
    >
      {children}
    </td>
  );
}
