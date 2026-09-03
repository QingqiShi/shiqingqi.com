import type { ComponentProps } from "react";
import { alignStyles, styles } from "./table-cell.stylex.ts";

export type TableCellAlign = "start" | "center" | "end";

export interface TableCellAlignment {
  /** Text alignment. Defaults to `"start"`, or `"end"` when `numeric`. */
  align?: TableCellAlign;
  /**
   * Renders figures at a fixed width and end-aligns the cell, so a column of
   * numbers lines up digit for digit. Set it on the column's header too.
   */
  numeric?: boolean;
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
