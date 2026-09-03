import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { transition } from "../../primitives/motion.stylex.ts";
import { space } from "../../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";

interface CardProps extends Omit<ComponentProps<"div">, "className" | "style"> {
  /**
   * Adds hover and focus affordances for a card that acts as a clickable
   * control. To make the whole card a link instead, compose `cardSurface` on
   * your own `<Link>`/`<a>` — `Card` always renders a `<div>`.
   */
  interactive?: boolean;
  /** Card contents. */
  children: ReactNode;
}

/**
 * The system's bordered-surface container: a 1px neutral border, rounded
 * corners, and a raised surface background.
 * Forwards native `<div>` attributes and `ref`; `css` composes last, so a
 * caller can override anything, including the padding.
 */
export function Card({
  interactive = false,
  css,
  ref,
  children,
  ...restProps
}: CardProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      css={[
        styles.base,
        cardSurface.base,
        interactive && transition.colors,
        interactive && cardSurface.interactive,
        css,
      ]}
    >
      {children}
    </div>
  );
}

export { CardHeader } from "./card-header.tsx";
export { CardTitle } from "./card-title.tsx";
export { CardDescription } from "./card-description.tsx";
export { CardContent } from "./card-content.tsx";
export { CardFooter } from "./card-footer.tsx";

const styles = stylex.create({
  base: {
    boxSizing: "border-box",
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});
