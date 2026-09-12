import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color, font } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

interface TableRowProps extends Omit<
  ComponentProps<"tr">,
  "className" | "style"
> {
  /**
   * Marks the row the visitor is on, pairing the tint with heavier type so
   * the state survives a colour-blind or forced-colours read.
   * Sets `aria-current="true"` by default; pass `aria-current` yourself for a
   * different value.
   *
   * @zh 标记访客当前所在的行，用色块加粗体同时表达状态，即使在色盲或强制颜色模式下也可辨识。默认设置 `aria-current="true"`；如需其他取值，请自行传入 `aria-current`。
   */
  current?: boolean;
  /**
   * StyleX styles merged over the row's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在行自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
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
    backgroundColor: color.accentSurface,
    fontWeight: font.weight_6,
  },
});
