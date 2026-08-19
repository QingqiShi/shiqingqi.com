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
   * On an edge with a chrome slot, how far it reaches past the chrome's
   * inner edge instead.
   * @default "1.5rem"
   */
  depth?: string;
  /**
   * Chrome pinned over the region's start edge — a header row the content
   * scrolls beneath. The slot rides inside the scroller, stuck to the
   * scrollport's start, and takes that edge's band with it: the band grows to
   * the chrome's own box plus `depth`, so content on its way out blurs
   * progressively across the whole chrome — strongest at the outer edge, sharp
   * again just past the inner one. The chrome itself stays crisp and
   * interactive above the band. Sized purely by its content, with no
   * measurement, so the server render already matches.
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
   * ring belongs here too. With a chrome slot the scroller lays out as
   * [start chrome, content, end chrome] along the scroll axis, so scroll-axis
   * padding belongs inside the slots and the children rather than here — on
   * the scroller it would unpin the chrome from the edge.
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
 * of layers blurring what scrolls beneath them. A bare edge's band is an
 * absolutely positioned sibling of the scroller, `depth` deep against that
 * edge. An edge with a chrome slot carries its band inside the slot instead:
 * the slot sticks to the scrollport's edge, and the band covers the chrome
 * and reaches `depth` past it, so the ramp spans chrome plus depth and the
 * content blurs out across the furniture rather than stopping beneath it.
 * Either way a band has to sit over the content and stay put while that
 * content moves under it.
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
  const bandDepth = isHorizontal
    ? dynamicStyles.inlineDepth(depth)
    : dynamicStyles.blockDepth(depth);

  const startChromeRef = useRef<HTMLDivElement>(null);
  const endChromeRef = useRef<HTMLDivElement>(null);
  // Scroll padding mirroring each slot's size, so scrolling an element into
  // view — a link taking keyboard focus, an anchor jump — clears the chrome
  // instead of surfacing the element beneath it. Behavioural only (nothing is
  // painted from it), so measuring after hydration costs no flash, and
  // without `ResizeObserver` it just stays off.
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
            <MaskBand
              css={[
                isHorizontal ? styles.bandInlineStart : styles.bandBlockStart,
                isHorizontal
                  ? dynamicStyles.reachInlineEnd(depth)
                  : dynamicStyles.reachBlockEnd(depth),
              ]}
              direction={isHorizontal ? "to right" : "to bottom"}
              radius={radius}
              isShown={showStartMask}
            />
            <div css={styles.chromeContent}>{startChrome}</div>
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
            <MaskBand
              css={[
                isHorizontal ? styles.bandInlineEnd : styles.bandBlockEnd,
                isHorizontal
                  ? dynamicStyles.reachInlineStart(depth)
                  : dynamicStyles.reachBlockStart(depth),
              ]}
              direction={isHorizontal ? "to left" : "to top"}
              radius={radius}
              isShown={showEndMask}
            />
            <div css={styles.chromeContent}>{endChrome}</div>
          </div>
        )}
      </div>
      {!hasStartChrome && (
        <MaskBand
          css={[
            isHorizontal ? styles.bandInlineStart : styles.bandBlockStart,
            bandDepth,
          ]}
          direction={isHorizontal ? "to right" : "to bottom"}
          radius={radius}
          isShown={showStartMask}
        />
      )}
      {!hasEndChrome && (
        <MaskBand
          css={[
            isHorizontal ? styles.bandInlineEnd : styles.bandBlockEnd,
            bandDepth,
          ]}
          direction={isHorizontal ? "to left" : "to top"}
          radius={radius}
          isShown={showEndMask}
        />
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
  // own positioned descendants would otherwise paint over it in DOM order.
  // Sticky plus z-index only: opacity, filter or mask here would make the slot
  // a backdrop root and cut its band's layers off from the page beneath.
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
  // Positioned after the band in DOM order, so it paints above the layers and
  // the chrome stays crisp: backdrop-filter only blurs what painted before it.
  chromeContent: {
    position: "relative",
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

// The depth is a consumer-supplied length, so it composes as a dynamic style
// rather than an inline `style` attribute. The `reach*` members stretch a
// slot's band `depth` past the chrome's inner edge; its other three insets pin
// it to the slot, so the band's size tracks the chrome's content-driven size
// with no measurement.
const dynamicStyles = stylex.create({
  blockDepth: (depth: string) => ({ blockSize: depth }),
  inlineDepth: (depth: string) => ({ inlineSize: depth }),
  reachBlockStart: (depth: string) => ({
    insetBlockStart: `calc(-1 * ${depth})`,
  }),
  reachBlockEnd: (depth: string) => ({
    insetBlockEnd: `calc(-1 * ${depth})`,
  }),
  reachInlineStart: (depth: string) => ({
    insetInlineStart: `calc(-1 * ${depth})`,
  }),
  reachInlineEnd: (depth: string) => ({
    insetInlineEnd: `calc(-1 * ${depth})`,
  }),
  scrollPaddingBlock: (start: number, end: number) => ({
    scrollPaddingBlockStart: `${String(start)}px`,
    scrollPaddingBlockEnd: `${String(end)}px`,
  }),
  scrollPaddingInline: (start: number, end: number) => ({
    scrollPaddingInlineStart: `${String(start)}px`,
    scrollPaddingInlineEnd: `${String(end)}px`,
  }),
});
