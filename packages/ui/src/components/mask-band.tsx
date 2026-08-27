import * as stylex from "@stylexjs/stylex";
import type { StyleProp } from "../css-prop-types.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { buildEdgeBlurLayers } from "./progressive-blur-masks.ts";

interface MaskBandProps {
  /** Placement against one edge of its positioning box, and the reach. */
  css: StyleProp;
  direction: string;
  radius: number;
  isShown: boolean;
}

/**
 * One Scroll mask band: the stack of blurred layers that sits over a scroll
 * region's edge and blurs the content passing beneath it. The caller places
 * the band and sizes it to how far the blur reaches, because the ramp always
 * spans the whole band — an edge of a scroller, or a piece of chrome plus the
 * reach past it.
 *
 * Shared by every Scroll mask so the melt lives in one place: `ScrollMask`'s
 * own edges and slots, and the page-level band over a shell's fixed bar.
 */
export function MaskBand({ css, direction, radius, isShown }: MaskBandProps) {
  return (
    <div aria-hidden="true" css={[styles.band, css]}>
      {buildEdgeBlurLayers({ direction, radius, isShown }).map(
        ({ filter, mask }, index) => (
          <div
            key={index}
            css={[
              styles.layer,
              !isShown && styles.hidden,
              dynamicStyles.layer(filter, mask),
            ]}
          />
        ),
      )}
    </div>
  );
}

const styles = stylex.create({
  band: {
    position: "absolute",
    pointerEvents: "none",
  },
  hidden: {
    visibility: "hidden",
  },
  // An edge shows and hides by melting its radius, never by animating opacity:
  // opacity below 1 on an ancestor makes that ancestor a backdrop root,
  // cutting the page off from the filters beneath it, so animating opacity
  // would drop the blur for the whole duration. The same trap rules out ever
  // wrapping these layers in anything carrying opacity, a filter, or a mask.
  // `visibility` transitions rather than flipping, so the layers stay visible
  // until the melt ends and the compositor stops paying afterwards.
  layer: {
    position: "absolute",
    inset: 0,
    visibility: "visible",
    transition: {
      default: `backdrop-filter ${duration._300} ${easing.ease}, visibility ${duration._300}`,
      [motionConstants.REDUCED_MOTION]: `backdrop-filter ${duration._150} ${easing.ease}, visibility ${duration._150}`,
    },
  },
});

// The ramp is computed per layer, so it composes as a dynamic style rather
// than an inline `style` attribute.
const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
});
