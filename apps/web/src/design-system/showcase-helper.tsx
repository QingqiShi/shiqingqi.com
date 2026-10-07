import * as stylex from "@stylexjs/stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { measure } from "./measure.stylex.ts";
import { onReadingColumn } from "./reading-column.stylex.ts";

interface ShowcaseHelperProps {
  children: ReactNode;
}

export function ShowcaseHelper({ children }: ShowcaseHelperProps) {
  return (
    <p css={[typeRole.caption, styles.helper, onReadingColumn.base]}>
      {children}
    </p>
  );
}

const styles = stylex.create({
  helper: {
    margin: 0,
    color: color.fgMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
