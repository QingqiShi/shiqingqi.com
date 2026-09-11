import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocHeader } from "../doc-header.tsx";
import type { DesignSystemPath } from "../routes/types.ts";

interface LabPageProps {
  /** The documentation route this Lab belongs to. */
  path: DesignSystemPath;
  /** The Lab itself — a client island, because the Canvas is operable. */
  children: ReactNode;
}

/**
 * The Lab's frame: the header, and the Canvas below it. Both take the Shell's
 * content width rather than the reading column, because the Lab has nothing to
 * read — the title stands over the Canvas and the view switch over the
 * controls. The description stays on the documentation view.
 */
export function LabPage({ path, children }: LabPageProps) {
  return (
    <article css={styles.page}>
      <DocHeader path={path} />
      {children}
    </article>
  );
}

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
});
