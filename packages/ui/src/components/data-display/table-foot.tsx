import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

interface TableFootProps extends Omit<
  ComponentProps<"tfoot">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the foot group's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在表尾分组自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** The `<tfoot>` group, for totals and summary rows. */
export function TableFoot({
  css,
  ref,
  children,
  ...restProps
}: TableFootProps) {
  return (
    <tfoot {...restProps} ref={ref} css={[styles.foot, css]}>
      {children}
    </tfoot>
  );
}

const styles = stylex.create({
  foot: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});
