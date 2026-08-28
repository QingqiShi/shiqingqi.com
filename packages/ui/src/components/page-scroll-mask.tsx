"use client";

import * as stylex from "@stylexjs/stylex";
import { usePageScrollMask } from "../hooks/use-page-scroll-mask.ts";
import { space } from "../tokens.stylex.ts";
import { MaskBand } from "./mask-band.tsx";

interface PageScrollMaskProps {
  /**
   * Nominal blur radius in px against the viewport's top edge, where the mask
   * is strongest — the stacked layers compound to slightly above it. Clamped
   * to the cap (32).
   * @default 8
   */
  radius?: number;
  /**
   * How far the mask reaches past the chrome's inner edge before the content
   * is sharp again. Any CSS length.
   * @default "1.5rem"
   */
  depth?: string;
}

/**
 * The page's Scroll mask, for a shell whose fixed chrome the content scrolls
 * beneath. Renders one band filling the chrome it is placed in and reaching
 * `depth` past its inner edge, so content on its way out of view blurs
 * progressively across the whole bar — strongest at the viewport edge, sharp
 * again just past the bar. The band melts away while the page rests at the
 * top, where nothing has scrolled away yet.
 *
 * Place it as the first child of the fixed chrome, which is the box it sizes
 * itself against: everything after it in DOM order paints above the layers and
 * stays crisp, because `backdrop-filter` only blurs what painted before it.
 * The chrome must carry nothing that makes it a backdrop root — no opacity
 * below 1, no filter, no mask — or the band has no page left to blur.
 */
export function PageScrollMask({
  radius = 8,
  depth = space._5,
}: PageScrollMaskProps) {
  const { showStartMask } = usePageScrollMask();

  return (
    <MaskBand
      css={[styles.band, dynamicStyles.reach(depth)]}
      edge="block-start"
      radius={radius}
      isShown={showStartMask}
    />
  );
}

const styles = stylex.create({
  // Three insets pin the band to the chrome's own box, so it spans the bar
  // whatever height the bar is given; `reach` stretches the fourth one past
  // the bar's inner edge.
  band: {
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
  },
});

// The depth is a consumer-supplied length, so it composes as a dynamic style
// rather than an inline `style` attribute.
const dynamicStyles = stylex.create({
  reach: (depth: string) => ({ insetBlockEnd: `calc(-1 * ${depth})` }),
});
