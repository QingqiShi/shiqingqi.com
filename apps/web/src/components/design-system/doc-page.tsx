import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocHeader } from "./doc-header.tsx";
import { readingColumn } from "./reading-column.stylex.ts";
import type { DesignSystemPath } from "./routes/types.ts";

interface DocPageProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  description: ReactNode;
  children: ReactNode;
}

/**
 * Shared header + body frame for a single design-system entry — one foundation,
 * component, or composed example per route. Sets the header and the body on
 * the reading column; a breakout Showcase inside the body spans the Shell's
 * content width instead.
 */
export function DocPage({ path, description, children }: DocPageProps) {
  return (
    <article css={styles.page}>
      <div css={styles.readingColumn}>
        <DocHeader path={path} description={description} />
        <div css={styles.body}>{children}</div>
      </div>
    </article>
  );
}

const styles = stylex.create({
  // Full-width container: a breakout Showcase inside `readingColumn` sizes
  // itself against this element's inline size.
  page: {
    containerType: "inline-size",
  },
  readingColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._6,
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
});
