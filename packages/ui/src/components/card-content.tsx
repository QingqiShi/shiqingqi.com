import type { ComponentProps } from "react";
import { slotStyles } from "./card-slot.stylex.ts";

/** The card's main content region. */
export function CardContent({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"div">, "className" | "style">) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, css]}>
      {children}
    </div>
  );
}
