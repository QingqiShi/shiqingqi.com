import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { color } from "../color.stylex.ts";
import { border, font } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { tableTokens } from "./table.stylex.ts";

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
   * Tints the row in the colour of an Intent. `"warning"` marks a row that
   * waits for the visitor, such as a transaction with no category; `"destructive"`
   * marks a row where something failed. The tint does not say why, so put
   * the reason or the action in a cell of the row.
   *
   * @zh 以意图的颜色为整行着色。`"warning"` 标记等待访客处理的行，例如尚未分类的交易；`"destructive"` 标记出错的行。色调本身不说明原因，因此请在该行的某个单元格中写明原因或操作。
   */
  intent?: "warning" | "destructive";
  /**
   * Marks a row that sums other rows. `"subtotal"` is the sum of a group and
   * takes heavier type. `"total"` is the sum of a whole side or of the table
   * and also takes a quiet fill.
   *
   * @zh 标记汇总其他行的行。`"subtotal"` 是一组的小计，字重更重；`"total"` 是一侧或整张表的合计，另带安静的填充。
   */
  look?: "subtotal" | "total";
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
  intent,
  look,
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
      css={[
        styles.row,
        look && lookStyles[look],
        intent && intentStyles[intent],
        current && styles.currentRow,
        css,
      ]}
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
    borderBlockStartColor: color.border,
  },
  currentRow: {
    backgroundColor: color.primarySubtle,
    fontWeight: font.weight_6,
  },
});

const lookStyles = stylex.create({
  subtotal: {
    fontWeight: font.weight_6,
  },
  total: {
    fontWeight: font.weight_7,
    backgroundColor: color.muted,
    [tableTokens.rowHeaderWeight]: font.weight_7,
    [tableTokens.stickyFill]: color.muted,
  },
});

const intentStyles = stylex.create({
  warning: {
    backgroundColor: color.warningSubtle,
  },
  destructive: {
    backgroundColor: color.destructiveSubtle,
  },
});
