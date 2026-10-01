import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface LabPageProps {
  /** The Lab itself — a client island, because the Canvas is operable. */
  children: ReactNode;
}

/**
 * The Lab view: the Canvas, a step below the header the route's `layout.tsx`
 * renders. It takes the Shell's content width rather than the reading column,
 * because the Lab has nothing to read — the title stands over the Canvas and
 * the view switch over the controls. The description stays on the
 * documentation view.
 */
export function LabPage({ children }: LabPageProps) {
  return <div css={styles.page}>{children}</div>;
}

const styles = stylex.create({
  page: {
    marginBlockStart: space._4,
  },
});
