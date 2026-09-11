import type { ReactNode } from "react";
import { DocHeader } from "./doc-header.tsx";
import type { DesignSystemPath } from "./routes/types.ts";

interface DocArticleProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  /** The view: the documentation, or the Lab. */
  children: ReactNode;
}

/**
 * A design-system entry: the header both of a route's views share, then the
 * view. A route with a Lab renders it from its `layout.tsx`. The header then
 * stays mounted while the view switches, and the switch's indicator slides
 * between the two. A route with one view renders it from `DocPage`.
 */
export function DocArticle({ path, children }: DocArticleProps) {
  return (
    <article>
      <DocHeader path={path} />
      {children}
    </article>
  );
}
