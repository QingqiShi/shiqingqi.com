import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { layer } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { tableTokens } from "./table.stylex.ts";

interface TableHeadProps extends Omit<
  ComponentProps<"thead">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the head group's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在表头分组自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** The `<thead>` group. Sticks when the root sets `stickyHeader`. */
export function TableHead({
  css,
  ref,
  children,
  ...restProps
}: TableHeadProps) {
  return (
    <thead {...restProps} ref={ref} css={[styles.head, css]}>
      {children}
    </thead>
  );
}

const styles = stylex.create({
  head: {
    position: "sticky",
    insetBlockStart: tableTokens.headInset,
    zIndex: layer.content,
    backgroundColor: tableTokens.headBackground,
  },
});
