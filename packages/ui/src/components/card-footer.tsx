import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { space } from "../tokens.stylex.ts";
import { slotStyles } from "./card-slot.stylex.ts";

/** A trailing row for the card's actions. */
export function CardFooter({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"div">, "className" | "style">) {
  return (
    <div {...restProps} ref={ref} css={[slotStyles.block, styles.footer, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  footer: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
});
