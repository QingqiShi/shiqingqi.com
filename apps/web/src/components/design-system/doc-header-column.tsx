"use client";

import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { useDesignSystemView } from "./lab/use-design-system-view.ts";
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
    <header
      css={[flex.col, styles.header, view === "docs" && styles.readingColumn]}
    >
      {children}
    </header>
  );
}

const styles = stylex.create({
  header: {
    gap: space._4,
  },
  readingColumn: {
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
});
