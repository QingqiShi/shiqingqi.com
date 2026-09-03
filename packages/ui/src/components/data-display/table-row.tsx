import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color, font } from "../../tokens.stylex.ts";

interface TableRowProps extends Omit<
  ComponentProps<"tr">,
  "className" | "style"
> {
  /**
   * Marks the row the visitor is on, pairing the tint with heavier type so
   * the state survives a colour-blind or forced-colours read.
   * Sets `aria-current="true"` by default; pass `aria-current` yourself for a
   * different value.
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

const styles = stylex.create({
  // Leading edge, so the last row in a group carries no trailing rule. `none`,
  // not transparent: a row outranks its group in the collapsed model, so
  // transparent would erase the group's own divide.
  row: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: { default: "solid", ":first-child": "none" },
    borderBlockStartColor: color.neutralBorder,
  },
  currentRow: {
    backgroundColor: color.surfaceAccentSubtle,
    fontWeight: font.weight_6,
  },
});
