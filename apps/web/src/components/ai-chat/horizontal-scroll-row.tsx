"use client";

import * as stylex from "@stylexjs/stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  ariaLabel: string;
  role?: "list" | "region";
  /** StyleX styles merged over the row's own — the ScrollMask root. */
  css?: StyleProp;
  /** StyleX styles merged over the scroller's own — padding, the card layout. */
  contentCss?: StyleProp;
}

export function HorizontalScrollRow({
  children,
  ariaLabel,
  role = "list",
  css,
  contentCss,
}: HorizontalScrollRowProps) {
  return (
    <ScrollMask
      orientation="horizontal"
      depth={space._8}
      role={role}
      aria-label={ariaLabel}
      tabIndex={0}
      scrollButtons={{
        startLabel: t({ en: "Scroll left", zh: "向左滚动" }),
        endLabel: t({ en: "Scroll right", zh: "向右滚动" }),
      }}
      clipMargin={space._3}
      css={[styles.root, css]}
      contentCss={[
        scrollX.base,
        scrollX.focusRing,
        styles.scrollContainer,
        contentCss,
      ]}
    >
      {children}
    </ScrollMask>
  );
}

// No corners: the row has no surface of its own, and a standalone row runs to
// the screen edge.
const styles = stylex.create({
  root: {
    marginInline: `calc(-1 * ${space._3})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    scrollSnapType: "x mandatory",
    paddingInline: space._3,
    scrollPaddingLeft: space._3,
    scrollPaddingRight: space._3,
  },
});
