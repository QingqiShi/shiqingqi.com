"use client";

import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { useDesignSystemView } from "#src/design-system/lab/use-design-system-view.ts";
import { readingColumn } from "./reading-column.stylex.ts";

interface DocHeaderColumnProps {
  docsPath: string;
  children: ReactNode;
}

/**
 * The header's box. Over the documentation it sits on the reading column with
 * the body; over the Lab it spans the Shell's content width, so the title
 * stands over the Canvas and the view switch over the controls.
 */
export function DocHeaderColumn({ docsPath, children }: DocHeaderColumnProps) {
  const view = useDesignSystemView(docsPath);

  return (
    <header css={[stack.item, view === "docs" && styles.readingColumn]}>
      {children}
    </header>
  );
}

const styles = stylex.create({
  readingColumn: {
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
});

interface DocsViewOnlyProps {
  docsPath: string;
  children: ReactNode;
}

/** Shows its children over the documentation, and hides them over the Lab. */
export function DocsViewOnly({ docsPath, children }: DocsViewOnlyProps) {
  return useDesignSystemView(docsPath) === "docs" ? children : null;
}
