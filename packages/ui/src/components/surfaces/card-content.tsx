import type { ComponentProps } from "react";
import type { StyleProp } from "../../types.ts";
import { slotStyles } from "./card-slot.stylex.ts";

interface CardContentProps extends Omit<
  ComponentProps<"div">,
  "className" | "style"
> {
  /**
   * StyleX styles merged over the content region's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在内容区自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** The card's main content region. */
export function CardContent({
  css,
  ref,
  children,
  ...restProps
}: CardContentProps) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, css]}>
      {children}
    </div>
  );
}
