"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  useScrollMask,
  type ScrollMaskOrientation,
} from "../hooks/use-scroll-mask.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { buildEdgeBlurLayers } from "./progressive-blur-masks.ts";

interface ScrollMaskProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style"
> {
  children: ReactNode;
  /**
   * Scroll axis. `"vertical"` masks the block-start and block-end edges;
   * `"horizontal"` masks the inline-start and inline-end edges.
   * @default "vertical"
   */
  orientation?: ScrollMaskOrientation;
  /**
   * Nominal blur radius in px against the edge, where the mask is strongest —
   * the stacked layers compound to slightly above it. Clamped to the cap (32).
   * @default 8
   */
  radius?: number;
  /**
   * How far the mask reaches from the edge into the region. Any CSS length.
   * @default "1.5rem"
   */
  depth?: string;
  /**
   * Controlled mask state. Pass BOTH `showStartMask` and `showEndMask` to
   * render the bands from them and skip the component's own scroll tracking —
   * for a consumer that already runs `useScrollMask` to drive sibling chrome
   * (e.g. scroll-to-page buttons) off the same element and wants one source of
   * truth. Omit both (the default) and ScrollMask tracks the scroll position
   * itself.
   */
  showStartMask?: boolean;
  showEndMask?: boolean;
  /**
   * StyleX styles merged over the ROOT's own — the escape hatch for how the
   * region sits in the layout around it: flex/grid sizing, block size, margin.
   * The root is the box the mask bands are positioned against, so it is also
   * where an outer size belongs.
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the SCROLLER's own — the escape hatch for the
   * content inside the region: padding, the layout of the children, scroll
   * manners, scrollbar treatment. The scroller owns the overflow, and it is
   * the element the `ref` and the native `div` attributes land on, so a focus
   * ring belongs here too.
   */
  contentCss?: StyleProp;
}

/**
 * A scroll region whose content blurs on its way out of view at each edge it
 * can still scroll to, so the region reads as continuing rather than stopping
 * at a line. Each edge masks only once there is scrolled-away content in that
 * direction, so a region resting at the start carries no start mask, and one
 * whose content fits carries neither.
 *
 * Renders three parts: a root holding the region's place in the layout, a
 * scroller inside it owning the overflow, and one band per edge — absolutely
 * positioned siblings of the scroller, each a stack of layers blurring what
 * scrolls beneath them. The scroller cannot also be the root: a band has to
 * sit over the content and stay put while that content moves under it.
 *
 * Forwards a `ref` and native `div` attributes (`role`, `aria-*`, `tabIndex`,
 * `onScroll`, …) to the scroller, so a consumer can name the region, measure
 * the element, or scroll it imperatively while ScrollMask keeps ownership of
 * the overflow and the bands.
 */
export function ScrollMask({
  children,
  orientation = "vertical",
  radius = 8,
  depth = space._5,
  showStartMask: startMaskProp,
  showEndMask: endMaskProp,
  css,
  contentCss,
  ref: forwardedRef,
  ...rest
}: ScrollMaskProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Controlled when the caller drives both edges — it is already running the
  // hook itself, so ScrollMask's own copy stays disabled to avoid a second set
  // of scroll/resize/mutation observers on the same element.
  const isControlled = startMaskProp !== undefined && endMaskProp !== undefined;
  const tracked = useScrollMask(scrollRef, orientation, {
    enabled: !isControlled,
  });
  const showStartMask = isControlled ? startMaskProp : tracked.showStartMask;
  const showEndMask = isControlled ? endMaskProp : tracked.showEndMask;

  const isHorizontal = orientation === "horizontal";
  const bandDepth = isHorizontal
    ? dynamicStyles.inlineDepth(depth)
    : dynamicStyles.blockDepth(depth);

  return (
    <div
      css={[
        styles.root,
        isHorizontal ? styles.rootHorizontal : styles.rootVertical,
        css,
      ]}
    >
      <div
        {...rest}
        ref={mergeRefs(scrollRef, forwardedRef)}
        css={[
          isHorizontal ? styles.scrollerHorizontal : styles.scrollerVertical,
          contentCss,
        ]}
      >
        {children}
      </div>
      <MaskBand
        css={[
          isHorizontal ? styles.bandInlineStart : styles.bandBlockStart,
          bandDepth,
        ]}
        direction={isHorizontal ? "to right" : "to bottom"}
        radius={radius}
        isShown={showStartMask}
      />
      <MaskBand
        css={[
          isHorizontal ? styles.bandInlineEnd : styles.bandBlockEnd,
          bandDepth,
        ]}
        direction={isHorizontal ? "to left" : "to top"}
        radius={radius}
        isShown={showEndMask}
      />
    </div>
  );
}

interface MaskBandProps {
  /** Placement against one edge of the root, and the depth it reaches. */
  css: StyleProp;
  direction: string;
  radius: number;
  isShown: boolean;
}

function MaskBand({ css, direction, radius, isShown }: MaskBandProps) {
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
  // `grid` hands the scroller the root's whole box on both axes without either
  // one having to name a size, so a region sized from outside (a flex row, a
  // 100%-height parent) and one sized by its own content both work.
  root: {
    position: "relative",
    display: "grid",
  },
  // Both the root and the scroller give up their automatic minimum size on the
  // scroll axis, so the region shrinks inside a flex or grid parent and
  // scrolls rather than pushing that parent open.
  rootVertical: {
    minBlockSize: 0,
  },
  rootHorizontal: {
    minInlineSize: 0,
  },
  scrollerVertical: {
    overflowX: "hidden",
    overflowY: "auto",
    minBlockSize: 0,
  },
  scrollerHorizontal: {
    overflowX: "auto",
    overflowY: "hidden",
    minInlineSize: 0,
  },
  band: {
    position: "absolute",
    pointerEvents: "none",
  },
  bandBlockStart: {
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
  },
  bandBlockEnd: {
    insetBlockEnd: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
  },
  bandInlineStart: {
    insetInlineStart: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
  },
  bandInlineEnd: {
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
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

// The depth is a consumer-supplied length and the ramp is computed per layer,
// so both compose as dynamic styles rather than inline `style` attributes.
const dynamicStyles = stylex.create({
  blockDepth: (depth: string) => ({ blockSize: depth }),
  inlineDepth: (depth: string) => ({ inlineSize: depth }),
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
    WebkitMaskImage: mask,
  }),
});
