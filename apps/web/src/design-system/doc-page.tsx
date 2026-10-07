import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { hasDesignSystemLab } from "#src/design-system/routes/has-design-system-lab.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { DocArticle } from "./doc-article.tsx";
import { readingColumn } from "./reading-column.stylex.ts";

interface DocPageProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  /**
   * The opening paragraph. A route with a Lab sets it on the `DocArticle` in
   * its `layout.tsx` instead, because the header lives there.
   */
  description?: ReactNode;
  children: ReactNode;
}

/**
 * The documentation view of a single design-system entry — one foundation,
 * component, or composed example per route. Sets the description and the body
 * on the reading column, under the header; a breakout Showcase inside the body
 * spans the Shell's content width instead.
 */
export function DocPage({ path, description, children }: DocPageProps) {
  const view = (
    <div css={styles.page}>
      <div css={[stack.section, styles.readingColumn]}>{children}</div>
    </div>
  );

  // A route with a Lab renders the article from its `layout.tsx`, so the
  // header stays mounted while the view switches — see `DocArticle`.
  return hasDesignSystemLab(path) ? (
    view
  ) : (
    <DocArticle path={path} description={description}>
      {view}
    </DocArticle>
  );
}

const styles = stylex.create({
  // Full-width container: a breakout Showcase inside `readingColumn` sizes
  // itself against this element's inline size.
  page: {
    containerType: "inline-size",
    marginBlockStart: rhythm.section,
  },
  readingColumn: {
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
});
