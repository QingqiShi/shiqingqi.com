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
} from "../../hooks/use-scroll-mask.ts";
import { space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { getScrollBehavior } from "../../utils/get-scroll-behavior.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import { MaskBand } from "./mask-band.tsx";
import { ScrollButton } from "./scroll-button.tsx";

interface ScrollMaskProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style"
> {
  /**
   * The region's content. It renders inside the scroller, which owns the
   * overflow and moves under the bands.
   *
   * @zh 区域的内容。它渲染在滚动元素内部，由滚动元素负责溢出滚动，并在虚化带下方移动。
   */
  children: ReactNode;
  /**
   * Scroll axis. `"vertical"` masks the block-start and block-end edges;
   * `"horizontal"` masks the inline-start and inline-end edges.
   *
   * @default "vertical"
   * @zh 滚动的轴向。纵向虚化块起始与块结束两条边，横向虚化行起始与行结束两条边。
   */
  orientation?: ScrollMaskOrientation;
  /**
   * Nominal blur radius in px against the edge, where the mask is strongest
   * — the stacked layers compound to slightly above it. Clamped to the cap
   * (32).
   *
   * @default 8
   * @zh 紧贴边缘（虚化最强处）的名义虚化半径（像素）——叠加的图层会让实际强度略高于该值。会被限制在上限（32）以内。
   */
  radius?: number;
  /**
   * How far the mask reaches from the edge into the region, as any CSS length —
   * past the chrome's inner edge instead, on an edge with a chrome slot. Keep it
   * at or above the root's corner radius, because a shorter band scales the
   * corner it inherits tighter than the region's own.
   *
   * @default "1.5rem"
   * @zh 虚化从边缘向区域内部延伸的距离。可用任意 CSS 长度——内容尺寸大的区域用更深的值，紧凑的区域用更浅的值。
   */
  depth?: string;
  /**
   * Chrome pinned over the region's start edge — a header row the content
   * scrolls beneath. The slot sits inside the scroller, stuck to the
   * scrollport's start, while that edge's band stays beside the scroller and
   * grows to the slot's measured box plus `depth`, so content on its way out
   * blurs across the whole chrome while the chrome itself stays crisp and
   * interactive.
   *
   * @zh 固定在起始边上的界面元素——内容从其下方滚过的页眉行。该插槽位于滚动元素内部、吸附在滚动口的起始边；这条边的虚化带仍在滚动元素之侧，并扩展到该元素实测的盒子加一个深度：内容在整个元素的盒子上虚化淡出，而元素绘制在虚化带之上，保持清晰且可交互。
   */
  startChrome?: ReactNode;
  /**
   * Chrome pinned over the region's end edge — a pinned footer or action bar.
   * The mirror of `startChrome`; the content between the slots grows to fill
   * the scrollport, so end chrome stays pinned even while the content is too
   * short to scroll.
   *
   * @zh 固定在结束边上的界面元素——固定页脚或操作栏。与 startChrome 互为镜像；插槽之间的内容会撑满区域，因此即使内容不足以滚动，endChrome 也始终固定在边缘。
   */
  endChrome?: ReactNode;
  /**
   * A button per edge that scrolls the region one page towards that edge, and
   * the accessible name for each — the package ships no i18n, so the names
   * come in as props. Each button appears on a non-touch device only, since a
   * touch device scrolls with a swipe, and only while its own edge masks. A
   * horizontal region should normally ask for them: a mouse has no horizontal
   * wheel, so without one the only way to reach the rest of the row is a
   * drag.
   *
   * @zh 为每条边各提供一个按钮，点击后向该边翻一页，并附上各自的无障碍名称——本包不含 i18n，名称由调用方传入。按钮只在非触控设备上出现，因为触控设备用滑动来滚动；且每个按钮只在自己那条边带虚化时才出现。横向区域通常都应传入：鼠标没有横向滚轮，没有按钮就只能靠拖动才能看到这一行的其余部分。
   */
  scrollButtons?: { startLabel: string; endLabel: string };
  /**
   * How far the scroller's overflow clip reaches past the root, on the axis
   * that does not scroll, as any CSS length — room for content that grows on
   * hover or on focus, or that casts a shadow, so it paints out over the
   * neighbours instead of being cut at the edge. The region takes no more
   * room: the scroller gets this much padding on that axis and the same size
   * back as a negative margin, replacing whatever padding `contentCss` sets
   * there. The CSS analogue `overflow-clip-margin` cannot do this job,
   * because it applies to `overflow: clip` alone.
   *
   * @zh 滚动元素的溢出裁切在非滚动轴上越过区域边界的距离。可用任意 CSS 长度——为悬停或聚焦时放大、或投下阴影的内容留出余地，让它绘制到邻近元素之上，而不是在边缘被切断。区域不会因此在布局中多占空间：滚动元素在该轴上获得同样大小的内边距，再以同样大小的负外边距还回去，因此它会覆盖 contentCss 在该轴上设置的内边距。
   */
  clipMargin?: string;
  /**
   * StyleX styles merged over the ROOT's own — the escape hatch for how the
   * region sits in the layout around it (flex or grid sizing, block size,
   * margin) and for its own surface: corners, border, background. The root
   * is the box the bands are positioned against, so it owns the radius too —
   * the scroller and the bands take it by inheritance. Nothing above the
   * bands may clip: not the root, and not a rounded ancestor of it.
   *
   * @zh 与根元素自身样式合并的 StyleX 样式——用于控制区域在周围布局中的位置：flex 或 grid 尺寸、块尺寸、外边距，以及区域的圆角。虚化带以根元素为定位基准，因此外部尺寸归这里，圆角同样归这里：滚动元素据这组圆角裁切自身的溢出，虚化带则继承取用。因此虚化带之上不得有任何 overflow 裁切——根元素不行，它带圆角的祖先也不行。
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the SCROLLER's own — padding, the layout of
   * the children, scroll manners, scrollbar treatment, and the focus ring.
   * The ref and the native attributes land on the scroller too. Corners go
   * on the root: a radius set here is taken over by the root's, so it does
   * not survive. With a chrome slot, scroll-axis padding belongs inside the
   * slots and the children rather than on the scroller, where it would
   * unpin the chrome from the edge.
   *
   * @zh 与滚动元素自身样式合并的 StyleX 样式——用于控制内部：内边距、子元素布局、滚动行为与滚动条样式。ref 与原生属性同样落在滚动元素上，因此聚焦环也归这里——但聚焦环沿用根元素的圆角：滚动元素的圆角覆盖在这组样式之上，在这里设置的圆角不会生效。使用插槽时，滚动轴方向的内边距应放在插槽与子元素内部，而不是滚动元素上——否则插槽会脱离边缘。
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

  // The scroll padding that keeps scrolled-to content clear of the chrome
  // covers the chrome slots themselves, and a sticky slot never moves, so the
  // reveal that follows any focus inside one always scrolls the region and is
  // never satisfied. `preventScroll` cannot reach
  // native focus (Tab, a click), so this undoes the reveal instead: at
  // `focusin` the reveal has moved the scroll position, but its `scroll`
  // event has not fired yet, so the last event-reported position is still the
  // pre-focus one, and restoring it before paint shows no jump. Sticky chrome
  // is always in view, so the restore never hides the focused control.
  useEffect(() => {
    if (!hasChrome) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const readScroll = () =>
      isHorizontal ? scroller.scrollLeft : scroller.scrollTop;
    let restingScroll = readScroll();
    const onScroll = () => {
      restingScroll = readScroll();
    };
    const onChromeFocusIn = () => {
      if (isHorizontal) scroller.scrollLeft = restingScroll;
      else scroller.scrollTop = restingScroll;
    };
    const chromeSlots = [startChromeRef.current, endChromeRef.current].filter(
      (slot) => slot !== null,
    );
    scroller.addEventListener("scroll", onScroll, { passive: true });
    for (const slot of chromeSlots) {
      slot.addEventListener("focusin", onChromeFocusIn);
    }
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      for (const slot of chromeSlots) {
        slot.removeEventListener("focusin", onChromeFocusIn);
      }
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
