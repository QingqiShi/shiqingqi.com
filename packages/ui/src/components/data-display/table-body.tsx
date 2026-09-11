import type { ComponentProps } from "react";
import type { StyleProp } from "../../types.ts";

interface TableBodyProps extends Omit<
  ComponentProps<"tbody">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the row group's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在行分组自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** The `<tbody>` group holding the table's rows. */
export function TableBody({
  css,
  ref,
  children,
  ...restProps
}: TableBodyProps) {
  return (
    <tbody {...restProps} ref={ref} css={css}>
      {children}
    </tbody>
  );
}
