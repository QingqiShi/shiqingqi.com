import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import type { ReactNode } from "react";

/** An action at the end of a title line, such as a `Section`'s `actions`. */
export function TitleAction({ children }: { children: ReactNode }) {
  return <div css={[flex.row, styles.box]}>{children}</div>;
}

const styles = stylex.create({
  // A button is taller than the title. It must not make the line taller,
  // because each title sits at the same distance from its rows.
  box: {
    blockSize: 0,
  },
});
