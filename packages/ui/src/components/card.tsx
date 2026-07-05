import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { transition } from "../primitives/motion.stylex.ts";
import { space } from "../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";

interface CardProps extends ComponentProps<"div"> {
  /**
   * Adds pointer affordances — a hover border and background lift plus an eased
   * colour transition — for a card that is itself clickable. Leave `false` (the
   * default) for a static surface such as a panel or an alert. When the whole
   * card needs to be a link, render your `<Link>`/`<a>` directly and compose
   * `cardSurface` from `@tuja/ui/components/card.stylex` instead — the package
   * intentionally keeps `Card` a `<div>` and framework-agnostic.
   */
  interactive?: boolean;
  /** Card contents. */
  children: ReactNode;
}

/**
 * The system's bordered-surface container: a 1px neutral border, rounded
 * corners, and a raised surface background. Renders a `<div>` and forwards
 * native div attributes (`role`, `id`, `onClick`, `data-*`, `className`,
 * `style`, `ref`) so a caller can add behaviour or a one-off override without a
 * wrapper. The `css` prop is composed last, letting a caller win over the
 * defaults — including the padding, so a denser or roomier card is a one-liner.
 */
export function Card({
  interactive = false,
  css,
  className,
  style,
  ref,
  children,
  ...restProps
}: CardProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      className={className}
      style={style}
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

const styles = stylex.create({
  base: {
    boxSizing: "border-box",
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});
