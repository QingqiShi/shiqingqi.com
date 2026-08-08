import * as stylex from "@stylexjs/stylex";
import type { StyleProp } from "@tuja/ui/css-prop-types";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";

interface WireframeBarProps {
  /** How far across its container the bar runs, e.g. `"45%"` or `"2.5rem"`. */
  width: string;
  /** Darker, for the one line in a group that stands in for a title. */
  strong?: boolean;
  css?: StyleProp;
}

/**
 * A single block of "content" inside a page miniature — the stand-in for a line
 * of text, a nav item, or a card.
 *
 * A component rather than composable styles because width is the only thing
 * that varies across the fourteen of them: as three styles per callsite, half
 * wrapped over five lines each to say "a darker bar, 55% wide". The dynamic
 * width style stays internal — it is the pattern `Skeleton` already uses, and
 * the widths are one-off proportions not worth naming.
 */
export function WireframeBar({ width, strong, css }: WireframeBarProps) {
  return (
    <div
      css={[
        corner.radius_1,
        styles.bar,
        strong ? styles.strong : null,
        styles.width(width),
        css,
      ]}
    />
  );
}

const styles = stylex.create({
  bar: {
    backgroundColor: color.neutralBorder,
    blockSize: space._0,
  },
  strong: {
    backgroundColor: color.textSubtle,
  },
  width: (inlineSize: string) => ({ inlineSize }),
});
