import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { color, controlSize } from "../tokens.stylex.ts";

/**
 * Muted caption for a group of controls inside a `MenuButton` popup. Purely
 * presentational — give it an `id` and point the group's `aria-labelledby` at
 * it when the popup contains multiple sections. Forwards native `<div>`
 * attributes (`id`, `aria-*`, `className`, `style`, `ref`) so that wiring, and
 * one-off overrides via `css`, are possible.
 */
export function MenuLabel({ children, css, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} css={[styles.label, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  label: {
    fontSize: controlSize._3,
    paddingBlockEnd: controlSize._2,
    color: color.textMuted,
  },
});
