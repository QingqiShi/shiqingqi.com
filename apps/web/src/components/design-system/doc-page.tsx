import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocArticle } from "./doc-article.tsx";
import { measure } from "./measure.stylex.ts";
import { readingColumn } from "./reading-column.stylex.ts";
import { hasDesignSystemLab } from "./routes/has-design-system-lab.ts";
import type { DesignSystemPath } from "./routes/types.ts";

interface DocPageProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  /** The opening paragraph. The Lab view omits it. */
  description: ReactNode;
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
      <div css={styles.readingColumn}>
        <p css={styles.description}>{description}</p>
        <div css={styles.body}>{children}</div>
      </div>
    </div>
  );

  // A route with a Lab renders the article from its `layout.tsx`, so the
  // header stays mounted while the view switches — see `DocArticle`.
  return hasDesignSystemLab(path) ? (
    view
  ) : (
    <DocArticle path={path}>{view}</DocArticle>
  );
}

const styles = stylex.create({
  // Full-width container: a breakout Showcase inside `readingColumn` sizes
  // itself against this element's inline size.
  page: {
    containerType: "inline-size",
  },
  // The description sits a step below the title, as the header's last line.
  readingColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._6,
    paddingBlockStart: space._2,
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
});
