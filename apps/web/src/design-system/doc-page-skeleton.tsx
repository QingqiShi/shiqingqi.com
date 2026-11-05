import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { readingColumn } from "./reading-column.stylex.ts";

/**
 * What a doc page shows while it loads: the shape of its first screen. The
 * header of `DocHeader` (breadcrumb, title, opening paragraph) on the reading
 * column, then the first `Showcase` cards of `DocPage`. Each text line is one
 * line box of its type role, so it takes the height of the real text.
 */
export function DocPageSkeleton({ css }: { css?: StyleProp }) {
  return (
    <div aria-busy css={css}>
      <div css={[stack.item, styles.readingColumn]}>
        <Skeleton
          width="18em"
          height="1em"
          css={[typeRole.label, styles.line]}
        />
        <div css={stack.tight}>
          <Skeleton
            width="5em"
            height="1em"
            css={[typeRole.subDisplay, styles.line]}
          />
          <div css={[stack.text, typeRole.body, styles.description]}>
            <Skeleton width="100%" height="1em" css={styles.line} />
            <Skeleton width="100%" height="1em" css={styles.line} />
            <Skeleton
              width="100%"
              height="1em"
              css={[styles.line, styles.narrowOnly]}
            />
            <Skeleton
              width="100%"
              height="1em"
              css={[styles.line, styles.narrowOnly]}
            />
            <Skeleton width="45%" height="1em" css={styles.line} />
          </div>
        </div>
      </div>
      <div css={[stack.section, styles.readingColumn, styles.body]}>
        {[0, 1].map((card) => (
          <div key={card} css={[stack.tight, cardSurface.base, styles.card]}>
            <Skeleton
              width="8em"
              height="1em"
              css={[typeRole.overline, styles.line]}
            />
            <Skeleton width="100%" height={space._13} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  readingColumn: {
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
  // The bar is as tall as a letter, centred in the line box of the role.
  line: {
    maxInlineSize: "100%",
    marginBlock: "calc((1lh - 1em) / 2)",
  },
  description: {
    maxInlineSize: measure.prose,
  },
  // A phone sets the opening paragraph on more lines.
  narrowOnly: {
    display: { default: null, [breakpoints.md]: "none" },
  },
  body: {
    marginBlockStart: rhythm.section,
  },
  card: {
    padding: space._7,
  },
});
