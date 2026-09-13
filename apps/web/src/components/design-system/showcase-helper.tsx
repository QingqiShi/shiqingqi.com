import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { measure } from "./measure.stylex.ts";
import { onReadingColumn } from "./reading-column.stylex.ts";

interface ShowcaseHelperProps {
  children: ReactNode;
}

export function ShowcaseHelper({ children }: ShowcaseHelperProps) {
  return <p css={[styles.helper, onReadingColumn.base]}>{children}</p>;
}

const styles = stylex.create({
  helper: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
