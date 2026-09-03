import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color } from "../../tokens.stylex.ts";

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

const styles = stylex.create({
  foot: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});
