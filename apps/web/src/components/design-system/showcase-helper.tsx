import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface ShowcaseHelperProps {
  children: ReactNode;
}

export function ShowcaseHelper({ children }: ShowcaseHelperProps) {
  return <p css={styles.helper}>{children}</p>;
}

const styles = stylex.create({
  helper: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
});
