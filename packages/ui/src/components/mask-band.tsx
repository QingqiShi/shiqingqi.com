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
 * region's edge and blurs the content passing beneath it. The caller sizes the
 * band to how far the blur reaches, because the ramp always spans the whole
 * band, and keeps the region's corners on the band's parent, because the band
 * and its layers take them by inheritance.
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
  // Show/hide melts the radius, not opacity: opacity below 1 makes an
  // ancestor a backdrop root, blocking the filters beneath it. Visibility
  // transitions instead of flipping, so layers stay visible until the melt
  // ends.
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

// Chromium drops the mask on a backdrop-filter descendant under a squircle
// overflow clip, so no ancestor here may use one.
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

const edges: Record<MaskBandEdge, { direction: string; corners: StyleProp }> = {
  "block-start": { direction: "to bottom", corners: corners.blockStart },
  "block-end": { direction: "to top", corners: corners.blockEnd },
  "inline-start": { direction: "to right", corners: corners.inlineStart },
  "inline-end": { direction: "to left", corners: corners.inlineEnd },
};

const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
});
