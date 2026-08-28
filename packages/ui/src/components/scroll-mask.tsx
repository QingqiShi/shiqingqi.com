"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  useScrollMask,
  type ScrollMaskOrientation,
} from "../hooks/use-scroll-mask.ts";
import { space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { MaskBand } from "./mask-band.tsx";

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
   * On an edge with a chrome slot, how far it reaches past the chrome's inner
   * edge instead: that edge's band is the chrome's measured size plus this.
   * Keep it at or above the root's corner radius — a band shorter than the
   * radius scales the corner it inherits tighter than the region's own.
   * @default "1.5rem"
   */
  depth?: string;
  /**
   * Chrome pinned over the region's start edge — a header row the content
   * scrolls beneath. The slot rides inside the scroller, stuck to the
   * scrollport's start, and is sized by its content. That edge's band, beside
   * the scroller, is sized from the slot's measured box plus `depth`, so it is
   * `depth` alone until the measurement lands — and stays there without
   * `ResizeObserver`. Neither costs a flash, because the bands start hidden.
   * Once measured, content on its way out blurs progressively across the whole
   * chrome — strongest at the outer edge, sharp again just past the inner one.
   * The chrome itself paints above the band and stays crisp and interactive.
   */
  startChrome?: ReactNode;
  /**
   * Chrome pinned over the region's end edge — a pinned footer or action bar.
   * The mirror of `startChrome`; the content between the slots grows to fill
   * the scrollport, so end chrome stays pinned to the region's end edge even
   * while the content is too short to scroll.
   */
  endChrome?: ReactNode;
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
   * region sits in the layout around it (flex/grid sizing, block size,
   * margin) and for the region's own surface: corners via `corner.radius_*`,
   * border, background. The root is the box the mask bands are positioned
   * against, and the box the scroller and the bands take their corners from
   * by inheritance. Never give it an overflow clip: the scroller clips its
   * own content to the root's corners, and a clip above the bands would
   * strip their masks (see `MaskBand`).
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the SCROLLER's own — the escape hatch for the
   * content inside the region: padding, the layout of the children, scroll
   * manners, scrollbar treatment. The scroller owns the overflow, and it is
   * the element the `ref` and the native `div` attributes land on, so a focus
   * ring belongs here too. Its corners are the root's, applied over these
   * styles, so a radius set here does not survive — corners go on the root.
   * With a chrome slot the scroller lays out as [start chrome, content, end
   * chrome] along the scroll axis, so scroll-axis padding belongs inside the
   * slots and the children rather than here — on the scroller it would unpin
   * the chrome from the edge.
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
 * scroller inside it owning the overflow, and one band per edge, each a stack
 * of layers blurring what scrolls beneath them. Every band is an absolutely
 * positioned sibling of the scroller, against the root's edge. A bare edge's
 * band is `depth` deep. An edge with a chrome slot pins the chrome sticky
 * inside the scroller and grows the band to the chrome's measured box plus
 * `depth`, so the ramp spans chrome plus depth and the content blurs out
 * across the furniture rather than stopping beneath it; the chrome paints
 * above the band and stays crisp. Either way a band has to sit over the
 * content and stay put while that content moves under it.
 *
 * The root never clips. The consumer puts the region's corners, border,
 * background and size on the root; the scroller rounds its own overflow clip
 * to those corners, and each band takes the two outer corners of its edge —
 * see `MaskBand` for why nothing above the bands may clip.
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
  startChrome,
  endChrome,
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
  const hasStartChrome = startChrome != null;
  const hasEndChrome = endChrome != null;
  const hasChrome = hasStartChrome || hasEndChrome;

  const startChromeRef = useRef<HTMLDivElement>(null);
  const endChromeRef = useRef<HTMLDivElement>(null);
  // Each slot's measured size sizes its edge's band (chrome plus `depth`) and
  // the scroll padding that keeps an element scrolled into view — a link
  // taking keyboard focus, an anchor jump — clear of the chrome. Measured
  // after hydration, so until then the chrome counts as 0. That costs no
  // flash: the bands start hidden until the scroll hook runs after mount, and
  // the scroll padding paints nothing. Without `ResizeObserver` a slotted band
  // stays `depth` deep and the padding stays off.
  const [chromeSizes, setChromeSizes] = useState({ start: 0, end: 0 });
  useEffect(() => {
    if (!hasChrome) return;
    if (typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const sizeOf = (el: HTMLElement | null) =>
        (isHorizontal ? el?.offsetWidth : el?.offsetHeight) ?? 0;
      setChromeSizes({
        start: sizeOf(startChromeRef.current),
        end: sizeOf(endChromeRef.current),
      });
    };
    const observer = new ResizeObserver(measure);
    if (startChromeRef.current) observer.observe(startChromeRef.current);
    if (endChromeRef.current) observer.observe(endChromeRef.current);
    return () => {
      observer.disconnect();
    };
  }, [hasChrome, hasStartChrome, hasEndChrome, isHorizontal]);

  const bandSize = (chromeSize: number | null) =>
    chromeSize === null ? depth : `calc(${String(chromeSize)}px + ${depth})`;
  const startSize = bandSize(hasStartChrome ? chromeSizes.start : null);
  const endSize = bandSize(hasEndChrome ? chromeSizes.end : null);

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
          hasChrome &&
            (isHorizontal
              ? styles.scrollerChromeRow
              : styles.scrollerChromeColumn),
          contentCss,
          // After `contentCss`: the corners are structural and belong to the
          // root, whatever radius a consumer style sets for its own outline.
          styles.scrollerCorners,
          hasChrome &&
            (isHorizontal
              ? dynamicStyles.scrollPaddingInline(
                  chromeSizes.start,
                  chromeSizes.end,
                )
              : dynamicStyles.scrollPaddingBlock(
                  chromeSizes.start,
                  chromeSizes.end,
                )),
        ]}
      >
        {hasStartChrome && (
          <div
            ref={startChromeRef}
            css={[
              styles.chrome,
              isHorizontal ? styles.chromeInlineStart : styles.chromeBlockStart,
            ]}
          >
            {startChrome}
          </div>
        )}
        {hasChrome ? <div css={styles.middle}>{children}</div> : children}
        {hasEndChrome && (
          <div
            ref={endChromeRef}
            css={[
              styles.chrome,
              isHorizontal ? styles.chromeInlineEnd : styles.chromeBlockEnd,
            ]}
          >
            {endChrome}
          </div>
        )}
      </div>
      <MaskBand
        css={[
          isHorizontal ? styles.bandInlineStart : styles.bandBlockStart,
          isHorizontal
            ? dynamicStyles.inlineSize(startSize)
            : dynamicStyles.blockSize(startSize),
        ]}
        edge={isHorizontal ? "inline-start" : "block-start"}
        radius={radius}
        isShown={showStartMask}
      />
      <MaskBand
        css={[
          isHorizontal ? styles.bandInlineEnd : styles.bandBlockEnd,
          isHorizontal
            ? dynamicStyles.inlineSize(endSize)
            : dynamicStyles.blockSize(endSize),
        ]}
        edge={isHorizontal ? "inline-end" : "block-end"}
        radius={radius}
        isShown={showEndMask}
      />
    </div>
  );
}

const styles = stylex.create({
  // `grid` hands the scroller the root's whole box on both axes without either
  // one having to name a size, so a region sized from outside (a flex row, a
  // 100%-height parent) and one sized by its own content both work. The root
  // carries the consumer's corners, border and background, never an overflow
  // clip: the scroller and the bands take the corners from it.
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
  // The scroller rounds its own overflow clip to the root's corners, so the
  // content is clipped like the region while the bands beside it are not.
  scrollerCorners: {
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // With a chrome slot the scroller becomes a flex line along the scroll axis:
  // slot, middle, slot — the middle grows, so end chrome pins to the
  // scrollport's end edge even while the content is short of filling it.
  scrollerChromeColumn: {
    display: "flex",
    flexDirection: "column",
  },
  scrollerChromeRow: {
    display: "flex",
    flexDirection: "row",
  },
  // `flexShrink: 0` keeps the middle at its content size, so a region taller
  // than its box overflows and scrolls instead of crushing the children.
  middle: {
    flexGrow: 1,
    flexShrink: 0,
  },
  // A slot sticks to its scrollport edge and stacks above the middle, whose
  // own positioned descendants would otherwise paint over it in DOM order,
  // and above its edge's band beside the scroller: `backdrop-filter` only
  // blurs what painted before it, so the chrome stays crisp.
  chrome: {
    position: "sticky",
    zIndex: 1,
    flexShrink: 0,
  },
  chromeBlockStart: {
    insetBlockStart: 0,
  },
  chromeBlockEnd: {
    insetBlockEnd: 0,
  },
  chromeInlineStart: {
    insetInlineStart: 0,
  },
  chromeInlineEnd: {
    insetInlineEnd: 0,
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
});

// A band's size along the scroll axis is a consumer-supplied length — plus a
// slot's measured size — so it composes as a dynamic style rather than an
// inline `style` attribute; so does the scroll padding.
const dynamicStyles = stylex.create({
  blockSize: (size: string) => ({ blockSize: size }),
  inlineSize: (size: string) => ({ inlineSize: size }),
  scrollPaddingBlock: (start: number, end: number) => ({
    scrollPaddingBlockStart: `${String(start)}px`,
    scrollPaddingBlockEnd: `${String(end)}px`,
  }),
  scrollPaddingInline: (start: number, end: number) => ({
    scrollPaddingInlineStart: `${String(start)}px`,
    scrollPaddingInlineEnd: `${String(end)}px`,
  }),
});
