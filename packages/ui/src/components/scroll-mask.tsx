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
import { absoluteFill, pointerConstants } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { space } from "../tokens.stylex.ts";
import { getScrollBehavior } from "../utils/get-scroll-behavior.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { IconButton } from "./icon-button.tsx";
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
   * A button per edge that scrolls the region one page towards that edge, and
   * the accessible name for each — the package ships no i18n, so the names
   * come in as props.
   *
   * The buttons appear on a non-touch device only, because a touch device
   * scrolls the region with a swipe; and each one appears only while its own
   * edge masks, so a region resting at the start carries the end button
   * alone, and one whose content fits carries neither. They sit inside the
   * region, one `space._3` in from their edge and centred on the other axis,
   * and they paint above the bands.
   *
   * A horizontal region should normally ask for them: a mouse has no
   * horizontal wheel, so without a button the only way to reach the rest of
   * the row is a drag.
   */
  scrollButtons?: { startLabel: string; endLabel: string };
  /**
   * How far the scroller's overflow clip reaches past the root, on the axis
   * that does not scroll. Any CSS length.
   *
   * For content that grows on hover or on focus, or that casts a shadow: it
   * paints out over the neighbours instead of being cut off at the region's
   * edge. The region takes no more room, because the scroller gets this much
   * padding on that axis and the same size back as a negative margin — so it
   * replaces whatever padding `contentCss` sets there. The scroller's own
   * outline, a focus ring, follows the enlarged box.
   *
   * The CSS analogue is `overflow-clip-margin`, which cannot do this job: it
   * applies to `overflow: clip` alone, and once one axis scrolls, a `clip` on
   * the other axis computes to `hidden`.
   */
  clipMargin?: string;
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
 * content and stay put while that content moves under it. `scrollButtons` adds
 * one button per edge on top, inside the root and above the bands.
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

/** The edge of a region a scroll button scrolls towards. */
type ScrollButtonEdge =
  "block-start" | "block-end" | "inline-start" | "inline-end";

// Inline carets matching Phosphor "CaretLeft" and friends, one per edge, so
// the package needs no icon dependency (the same recipe as `Breadcrumb`).
const caretPaths: Record<ScrollButtonEdge, string> = {
  "block-start": "M48 160l80-80 80 80",
  "block-end": "M208 96l-80 80-80-80",
  "inline-start": "M160 208l-80-80 80-80",
  "inline-end": "M96 48l80 80-80 80",
};

/**
 * The caret on a scroll button, pointing at the edge that button scrolls
 * towards. Decorative — `IconButton` hides it, and the button is named by the
 * label the consumer gives.
 */
function CaretIcon({ edge }: { edge: ScrollButtonEdge }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 256 256" fill="none">
      <path
        d={caretPaths[edge]}
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ScrollButtonProps {
  /** The edge this button scrolls the region towards. */
  edge: ScrollButtonEdge;
  /** Accessible name for the button. */
  label: string;
  /** Whether this button's own edge currently masks. */
  isShown: boolean;
  onClick: () => void;
}

/**
 * One `ScrollMask` scroll button, pinned to its edge and shown only while
 * that edge masks. Split out of `ScrollMask`, its one consumer, so the start
 * and end buttons stay identical apart from the edge.
 */
function ScrollButton({ edge, label, isShown, onClick }: ScrollButtonProps) {
  const { fill, position } = scrollButtonEdges[edge];
  return (
    <IconButton
      icon={<CaretIcon edge={edge} />}
      aria-label={label}
      variant="surface"
      inert={!isShown}
      onClick={onClick}
      css={[
        transition.opacity,
        fill,
        styles.scrollButton,
        position,
        isShown ? styles.scrollButtonShown : styles.scrollButtonHidden,
      ]}
    />
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
  // On the same plane as a chrome slot and after the bands in DOM order, so
  // the button paints above the blur and stays crisp. It shows on a non-touch
  // device only: a touch device scrolls the region with a swipe, and the
  // button would only cover the content.
  scrollButton: {
    zIndex: 1,
    display: {
      default: "none",
      [pointerConstants.NON_TOUCH_DEVICE]: "flex",
    },
  },
  // Centred on the axis that does not scroll by `auto` margins between the
  // two insets `absoluteFill` sets on that axis, so the button keeps its
  // `transform` free.
  scrollButtonInlineStart: {
    insetInlineStart: space._3,
    marginBlock: "auto",
  },
  scrollButtonInlineEnd: {
    insetInlineEnd: space._3,
    marginBlock: "auto",
  },
  scrollButtonBlockStart: {
    insetBlockStart: space._3,
    marginInline: "auto",
  },
  scrollButtonBlockEnd: {
    insetBlockEnd: space._3,
    marginInline: "auto",
  },
  scrollButtonShown: {
    opacity: 1,
    pointerEvents: "auto",
  },
  scrollButtonHidden: {
    opacity: 0,
    pointerEvents: "none",
  },
});

// The axis a button is pinned along decides which axis `absoluteFill` spans
// it across: an inline-edge button is fixed along the inline axis, so it
// fills the block axis, and a block-edge button the reverse.
const scrollButtonEdges: Record<
  ScrollButtonEdge,
  { fill: StyleProp; position: StyleProp }
> = {
  "block-start": {
    fill: absoluteFill.x,
    position: styles.scrollButtonBlockStart,
  },
  "block-end": { fill: absoluteFill.x, position: styles.scrollButtonBlockEnd },
  "inline-start": {
    fill: absoluteFill.y,
    position: styles.scrollButtonInlineStart,
  },
  "inline-end": {
    fill: absoluteFill.y,
    position: styles.scrollButtonInlineEnd,
  },
};

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
  // The clip margin: the scrollport (the padding box) grows by this much on
  // the axis that does not scroll, and the negative margin gives the room
  // straight back, so the content keeps its place and the region its size.
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
