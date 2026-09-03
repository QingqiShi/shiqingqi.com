"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  useScrollMask,
  type ScrollMaskOrientation,
} from "../hooks/use-scroll-mask.ts";
import type { StyleProp } from "../style-prop.ts";
import { space } from "../tokens.stylex.ts";
import { getScrollBehavior } from "../utils/get-scroll-behavior.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { MaskBand } from "./mask-band.tsx";
import { ScrollButton } from "./scroll-button.tsx";

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
   * Nominal blur radius in px against the edge, where the mask is strongest.
   * Clamped to the cap (32).
   * @default 8
   */
  radius?: number;
  /**
   * How far the mask reaches from the edge into the region, as any CSS length —
   * past the chrome's inner edge instead, on an edge with a chrome slot. Keep it
   * at or above the root's corner radius, because a shorter band scales the
   * corner it inherits tighter than the region's own.
   * @default "1.5rem"
   */
  depth?: string;
  /**
   * Chrome pinned over the region's start edge — a header row the content
   * scrolls beneath. That edge's band grows to the slot's measured box plus
   * `depth`, so content on its way out blurs across the whole chrome while the
   * chrome itself stays crisp and interactive.
   */
  startChrome?: ReactNode;
  /**
   * Chrome pinned over the region's end edge — a pinned footer or action bar.
   * The mirror of `startChrome`; the content between the slots grows to fill
   * the scrollport, so end chrome stays pinned even while the content is too
   * short to scroll.
   */
  endChrome?: ReactNode;
  /**
   * A button per edge that scrolls the region one page towards that edge, and
   * the accessible name for each — the package ships no i18n, so the names come
   * in as props. Each button appears on a non-touch device only, and only while
   * its own edge masks.
   */
  scrollButtons?: { startLabel: string; endLabel: string };
  /**
   * How far the scroller's overflow clip reaches past the root, on the axis that
   * does not scroll, as any CSS length — for content that grows on hover or on
   * focus, or that casts a shadow. The region takes no more room; the CSS
   * analogue `overflow-clip-margin` cannot do this job, because it applies to
   * `overflow: clip` alone.
   */
  clipMargin?: string;
  /**
   * StyleX styles merged over the ROOT's own — the escape hatch for how the
   * region sits in the layout around it, and for its own surface: corners,
   * border, background. Never give it an overflow clip: the scroller clips its
   * own content, and a clip above the bands strips their masks (see `MaskBand`).
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the SCROLLER's own — padding, the layout of the
   * children, scroll manners, the focus ring. Corners go on the root, and with a
   * chrome slot scroll-axis padding belongs inside the slots and the children,
   * because on the scroller it would unpin the chrome from the edge.
   */
  contentCss?: StyleProp;
}

/**
 * A scroll region whose content blurs on its way out of view at each edge it
 * can still scroll to, so the region reads as continuing rather than
 * stopping at a line. The root never clips — the consumer's corners, border,
 * and background reach the scroller and bands by inheritance, so nothing
 * above the bands may clip either (see `MaskBand`).
 */
export function ScrollMask({
  children,
  orientation = "vertical",
  radius = 8,
  depth = space._5,
  startChrome,
  endChrome,
  scrollButtons,
  clipMargin,
  css,
  contentCss,
  ref: forwardedRef,
  ...rest
}: ScrollMaskProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(scrollRef, orientation);

  const isHorizontal = orientation === "horizontal";
  const hasStartChrome = startChrome != null;
  const hasEndChrome = endChrome != null;
  const hasChrome = hasStartChrome || hasEndChrome;

  const startChromeRef = useRef<HTMLDivElement>(null);
  const endChromeRef = useRef<HTMLDivElement>(null);
  // Each slot's measured size drives its edge's band and the scroll padding
  // that keeps a scrolled-to element clear of the chrome. Until it lands,
  // chrome counts as 0 — no flash, since bands start hidden and the padding
  // paints nothing.
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

  const scrollOnePage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const behavior = getScrollBehavior();
    el.scrollBy(
      isHorizontal
        ? { left: direction * el.clientWidth, behavior }
        : { top: direction * el.clientHeight, behavior },
    );
  };

  const bandSize = (chromeSize: number | null) =>
    chromeSize === null ? depth : `calc(${String(chromeSize)}px + ${depth})`;
  const startSize = bandSize(hasStartChrome ? chromeSizes.start : null);
  const endSize = bandSize(hasEndChrome ? chromeSizes.end : null);
  // A band reaches as far as the scroller does, so the clip margin moves both
  // together.
  const bandClip =
    clipMargin !== undefined &&
    (isHorizontal
      ? dynamicStyles.bandClipBlock(clipMargin)
      : dynamicStyles.bandClipInline(clipMargin));

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
          // After `contentCss`, because the clip margin is what decides the
          // scroller's box on the axis that does not scroll.
          clipMargin !== undefined &&
            (isHorizontal
              ? dynamicStyles.clipMarginBlock(clipMargin)
              : dynamicStyles.clipMarginInline(clipMargin)),
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
          bandClip,
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
          bandClip,
        ]}
        edge={isHorizontal ? "inline-end" : "block-end"}
        radius={radius}
        isShown={showEndMask}
      />
      {scrollButtons && (
        <>
          <ScrollButton
            edge={isHorizontal ? "inline-start" : "block-start"}
            label={scrollButtons.startLabel}
            isShown={showStartMask}
            onClick={() => {
              scrollOnePage(-1);
            }}
          />
          <ScrollButton
            edge={isHorizontal ? "inline-end" : "block-end"}
            label={scrollButtons.endLabel}
            isShown={showEndMask}
            onClick={() => {
              scrollOnePage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

const styles = stylex.create({
  // `grid` hands the scroller the root's whole box on both axes, so a region
  // sized from outside or by its own content both work.
  root: {
    position: "relative",
    display: "grid",
  },
  // Root and scroller both zero their minimum size on the scroll axis, so the
  // region shrinks in a flex/grid parent instead of pushing it open.
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
  // The scroller clips to the root's corners, so content clips like the
  // region while the sibling bands do not.
  scrollerCorners: {
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // With chrome, the scroller becomes a flex line — slot, middle, slot —
  // where the middle grows, so end chrome stays pinned even when content is
  // short.
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
  // z-index:1 clears the middle's own positioned descendants and this edge's
  // band. `backdrop-filter` only blurs what painted before it, so keeping this
  // chrome above keeps it crisp.
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
  // Padding grows the scrollport past the root on this axis. The matching
  // negative margin gives that room back, so the content's place and the
  // region's size don't shift.
  clipMarginBlock: (size: string) => ({
    paddingBlockStart: size,
    paddingBlockEnd: size,
    marginBlockStart: `calc(-1 * ${size})`,
    marginBlockEnd: `calc(-1 * ${size})`,
  }),
  clipMarginInline: (size: string) => ({
    paddingInlineStart: size,
    paddingInlineEnd: size,
    marginInlineStart: `calc(-1 * ${size})`,
    marginInlineEnd: `calc(-1 * ${size})`,
  }),
  bandClipBlock: (size: string) => ({
    insetBlockStart: `calc(-1 * ${size})`,
    insetBlockEnd: `calc(-1 * ${size})`,
  }),
  bandClipInline: (size: string) => ({
    insetInlineStart: `calc(-1 * ${size})`,
    insetInlineEnd: `calc(-1 * ${size})`,
  }),
});
