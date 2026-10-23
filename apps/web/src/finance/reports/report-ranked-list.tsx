"use client";

import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useId, type ReactNode } from "react";

interface ReportRankedListProps {
  title: string;
  headingLevel: 3 | 4;
  /** Beside the title, such as a legend for the rows' marks. */
  aside?: ReactNode;
  /** `RankedRow`s, largest first. */
  children: ReactNode;
}

/** A titled list of ranked lines, for one part of the week's spending. */
export function ReportRankedList({
  title,
  headingLevel,
  aside,
  children,
}: ReportRankedListProps) {
  const titleId = useId();
  return (
    <div css={stack.tight}>
      <div css={styles.header}>
        {headingLevel === 3 ? (
          <h3 id={titleId} css={[typeRole.label, styles.title]}>
            {title}
          </h3>
        ) : (
          <h4 id={titleId} css={[typeRole.label, styles.title]}>
            {title}
          </h4>
        )}
        {aside}
      </div>
      <ol aria-labelledby={titleId} css={stack.rows}>
        {children}
      </ol>
    </div>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    columnGap: rhythm.item,
    rowGap: rhythm.inline,
  },
  title: {
    margin: 0,
    color: color.fgMuted,
  },
});
