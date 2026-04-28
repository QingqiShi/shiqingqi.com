import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { color, controlSize } from "#src/tokens.stylex.ts";

export function MenuLabel({ children }: PropsWithChildren) {
  return <div css={styles.label}>{children}</div>;
}

const styles = stylex.create({
  label: {
    fontSize: controlSize._3,
    padding: `0 0 ${controlSize._2}`,
    color: color.textMuted,
  },
});
