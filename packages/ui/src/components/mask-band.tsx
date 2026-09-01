import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { buildEdgeBlurLayers } from "./build-edge-blur-layers.ts";

/** The edge of a region a band sits over, in the region's writing mode. */
type MaskBandEdge = "block-start" | "block-end" | "inline-start" | "inline-end";

interface MaskBandProps {
  /** Placement against one edge of its positioning box, and the reach. */
  css: StyleProp;
  /** The edge the band sits over; the ramp runs from it inward. */
  edge: MaskBandEdge;
  radius: number;
  isShown: boolean;
}

/**
 * One Scroll mask band: the stack of blurred layers that sits over a scroll
 * region's edge and blurs the content passing beneath it. The caller places
 * the band and sizes it to how far the blur reaches, because the ramp always
 * spans the whole band — an edge of a scroller, or a chrome slot plus the
 * reach past it.
 *
 * The band and its layers take the region's two corners on their edge by
 * inheritance, so a rounded region needs no clip above them. The caller keeps
 * the region's corners on the band's parent, and lets nothing between the
 * region and the band set corners of its own.
 *
 * Split out of `ScrollMask`, its one consumer, so every edge and slot melts
 * the same way.
 *
 * @internal
 */
export function MaskBand({ css, edge, radius, isShown }: MaskBandProps) {
  const { direction, corners: edgeCorners } = edges[edge];
  return (
    <div aria-hidden="true" css={[styles.band, edgeCorners, css]}>
      {buildEdgeBlurLayers({ direction, radius, isShown }).map(
        ({ filter, mask }, index) => (
          <div
            key={index}
            css={[
              styles.layer,
              edgeCorners,
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

// The layers inherit the region's two outer corners on their edge, through
// the band, and clip their own backdrop to them, so no ancestor has to clip
// them. None may with a squircle: Chromium drops the mask of a backdrop-filter
// descendant under a squircle overflow clip. The two inner corners stay square.
const corners = stylex.create({
  blockStart: {
    borderStartStartRadius: "inherit",
    borderStartEndRadius: "inherit",
    cornerStartStartShape: "inherit",
    cornerStartEndShape: "inherit",
  },
  blockEnd: {
    borderEndStartRadius: "inherit",
    borderEndEndRadius: "inherit",
    cornerEndStartShape: "inherit",
    cornerEndEndShape: "inherit",
  },
  inlineStart: {
    borderStartStartRadius: "inherit",
    borderEndStartRadius: "inherit",
    cornerStartStartShape: "inherit",
    cornerEndStartShape: "inherit",
  },
  inlineEnd: {
    borderStartEndRadius: "inherit",
    borderEndEndRadius: "inherit",
    cornerStartEndShape: "inherit",
    cornerEndEndShape: "inherit",
  },
});

// The ramp's `linear-gradient` direction runs from the edge inward, so the
// strongest layer sits against the edge.
const edges: Record<MaskBandEdge, { direction: string; corners: StyleProp }> = {
  "block-start": { direction: "to bottom", corners: corners.blockStart },
  "block-end": { direction: "to top", corners: corners.blockEnd },
  "inline-start": { direction: "to right", corners: corners.inlineStart },
  "inline-end": { direction: "to left", corners: corners.inlineEnd },
};

// The ramp is computed per layer, so it composes as a dynamic style rather
// than an inline `style` attribute.
const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
});
