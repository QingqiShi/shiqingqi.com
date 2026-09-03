import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { color, controlSize, font } from "../../tokens.stylex.ts";

/**
 * Muted caption for a group of controls inside a `MenuButton` popup. Purely
 * presentational — give it an `id` and point the group's `aria-labelledby` at
 * it when the popup contains multiple sections.
 */
export function MenuLabel({
  children,
  css,
  ...props
}: Omit<ComponentProps<"div">, "className" | "style">) {
  return (
    <div {...props} css={[styles.label, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  label: {
    fontSize: font.uiControlCaption,
    paddingBlockEnd: controlSize._2,
    color: color.textMuted,
  },
});
