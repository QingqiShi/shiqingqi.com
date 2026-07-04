import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { color, controlSize } from "../tokens.stylex.ts";

/**
 * Muted caption for a group of controls inside a `MenuButton` popup. Purely
 * presentational — pair it with `aria-labelledby` on the group it titles when
 * the popup contains multiple sections.
 */
export function MenuLabel({ children }: PropsWithChildren) {
  return <div css={styles.label}>{children}</div>;
}

const styles = stylex.create({
  label: {
    fontSize: controlSize._3,
    paddingBlockEnd: controlSize._2,
    color: color.textMuted,
  },
});
