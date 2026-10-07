import type { ComponentProps } from "react";
import { row } from "../primitives/stack.stylex.ts";
import type { StyleProp } from "../types.ts";

interface CardFooterProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the footer's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在尾部区自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** A trailing row for the card's actions. */
export function CardFooter({
  css,
  ref,
  children,
  ...restProps
}: CardFooterProps) {
  return (
    <div {...restProps} ref={ref} css={[row.tight, css]}>
      {children}
    </div>
  );
}
