"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { OptionalEffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { getScrollBehavior } from "../get-scroll-behavior.ts";
import { useScrollMaskFlushCheck } from "../hooks/use-scroll-mask-flush-check.ts";
import {
  useScrollMask,
  type ScrollMaskOrientation,
} from "../hooks/use-scroll-mask.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { MaskBand } from "./mask-band.tsx";
import { ScrollButton } from "./scroll-button.tsx";
import { dynamicStyles, styles } from "./scroll-mask-styles.stylex.ts";
import { useScrollMaskFocus } from "./use-scroll-mask-focus.ts";

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
   * How far the mask reaches past the start chrome, or from the start edge,
   * where that differs from `depth`: a header that floats over the content
   * can take a longer ramp than the end edge.
   *
   * @default The value of `depth`
   * @zh 起始边的虚化延伸距离，仅在与 depth 不同时传入：浮在内容之上的页眉可以比结束边用更长的渐变。
   */
  startDepth?: string;
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
   * StyleX styles merged over the `startChrome` slot's own, which pin it sticky
   * against the start edge. The mirror of `endChromeCss`.
   *
   * @zh 与 startChrome 插槽自身样式合并的 StyleX 样式。插槽默认粘附在起始边上。与 endChromeCss 互为镜像。
   */
  startChromeCss?: StyleProp;
  /**
   * Blurs the start edge while the region can scroll back to it. Turn it off
   * where content stays pinned at that edge inside the scroller, such as a
   * sticky first column, which then marks the edge itself.
   *
   * @default true
   * @zh 区域可以滚回起始边时，在起始边虚化。如果有内容在滚动元素内固定在这条边上，例如固定的第一列，请关闭它，由该内容自己标出这条边。
   */
  startMask?: boolean;
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
   * StyleX styles merged over the `endChrome` slot's own, which pin it sticky
   * against the end edge — for chrome that sits somewhere else, such as a
   * footer fixed to the viewport. A slot taken out of flow no longer holds
   * its room in the scroller, so pad the scroller's end in `contentCss` with
   * `scrollMaskTokens.endChrome`, the slot's measured size. The band and
   * the scroll padding follow that size wherever the slot sits. A scrollbar
   * that takes room narrows the content but not such a slot, so take
   * `scrollMaskTokens.scrollbar` off the size of the slot across the scroll
   * axis.
   *
   * @zh 与 endChrome 插槽自身样式合并的 StyleX 样式。插槽默认粘附在结束边上；这组样式用于放在别处的界面元素，例如固定在视口上的页脚。脱离文档流的插槽不再在滚动元素中占位，因此请在 contentCss 中用 `scrollMaskTokens.endChrome`（插槽的实测尺寸）为滚动元素的结束端补上内边距。无论插槽在哪里，虚化带与滚动内边距都随这个尺寸变化。占位的滚动条会让内容变窄，却不会让这样的插槽变窄，因此请从插槽在非滚动轴上的尺寸中减去 `scrollMaskTokens.scrollbar`。
   */
  endChromeCss?: StyleProp;
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
 *
 * Render the region flush against its container's visible edge on the axis
 * it scrolls, and inset the content inside the region instead. Otherwise the
 * content blurs out short of that edge. In development, a region that is not
 * flush warns in the console.
 *
 * A vertical region is a Scroll region of the effect layer: the effects of
 * the controls in it move with its scroll. A box in the scroller holds the
 * content and takes the scroller's layout of the children, so `contentCss`
 * still lays them out. The chrome stays over the effects.
 */
export function ScrollMask({
  children,
  orientation = "vertical",
  radius = 8,
  depth = space._5,
  startDepth = depth,
  startChrome,
  startChromeCss,
  startMask = true,
  endChrome,
  endChromeCss,
  scrollButtons,
  clipMargin,
  css,
  contentCss,
  ref: forwardedRef,
  ...rest
}: ScrollMaskProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(scrollRef, orientation);
  useScrollMaskFlushCheck(rootRef, orientation, showStartMask || showEndMask);

  const isHorizontal = orientation === "horizontal";
  // The effect layer has bands only on the block axis, so only a vertical
  // region is a Scroll region.
  const region = useScrollRegion();
  const { scroller: regionScroller, content: regionContent } = region;
  const isRegion = !isHorizontal;
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
  const [scrollbarSize, setScrollbarSize] = useState(0);
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
      const scroller = scrollRef.current;
      if (scroller !== null) {
        setScrollbarSize(
          isHorizontal
            ? scroller.offsetHeight - scroller.clientHeight
            : scroller.offsetWidth - scroller.clientWidth,
        );
      }
    };
    const observer = new ResizeObserver(measure);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (startChromeRef.current) observer.observe(startChromeRef.current);
    if (endChromeRef.current) observer.observe(endChromeRef.current);
    return () => {
      observer.disconnect();
    };
  }, [hasChrome, hasStartChrome, hasEndChrome, isHorizontal]);

  const isSnapSuspended = useScrollMaskFocus({
    scrollRef,
    startChromeRef,
    endChromeRef,
    isHorizontal,
    hasChrome,
    hasStartChrome,
    hasEndChrome,
  });

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

  const bandSize = (chromeSize: number | null, reach: string) =>
    chromeSize === null ? reach : `calc(${String(chromeSize)}px + ${reach})`;
  const startSize = bandSize(
    hasStartChrome ? chromeSizes.start : null,
    startDepth,
  );
  const endSize = bandSize(hasEndChrome ? chromeSizes.end : null, depth);
  // A band reaches as far as the scroller does, so the clip margin moves both
  // together.
  const bandClip =
    clipMargin !== undefined &&
    (isHorizontal
      ? dynamicStyles.bandClipBlock(clipMargin)
      : dynamicStyles.bandClipInline(clipMargin));

  return (
    <div
      ref={rootRef}
      css={[
        styles.root,
        isHorizontal ? styles.rootHorizontal : styles.rootVertical,
        css,
      ]}
    >
      <div
        {...rest}
        ref={mergeRefs(
          scrollRef,
          forwardedRef,
          isRegion ? regionScroller : undefined,
        )}
        css={[
          isHorizontal ? styles.scrollerHorizontal : styles.scrollerVertical,
          hasChrome &&
            (isHorizontal
              ? styles.scrollerChromeRow
              : styles.scrollerChromeColumn),
          a11y.focusRing,
          contentCss,
          isSnapSuspended && styles.snapSuspended,
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
          hasEndChrome && dynamicStyles.endChromeSize(chromeSizes.end),
          hasChrome && dynamicStyles.scrollbarSize(scrollbarSize),
          // After `contentCss`, because the clip margin is what decides the
          // scroller's box on the axis that does not scroll.
          clipMargin !== undefined &&
            (isHorizontal
              ? dynamicStyles.clipMarginBlock(clipMargin)
              : dynamicStyles.clipMarginInline(clipMargin)),
        ]}
      >
        <OptionalEffectCarrier value={isRegion ? region : null}>
          {hasStartChrome && (
            <ChromeSlot
              ref={startChromeRef}
              isRegion={isRegion}
              css={[
                isHorizontal
                  ? styles.chromeInlineStart
                  : styles.chromeBlockStart,
                startChromeCss,
              ]}
            >
              {startChrome}
            </ChromeSlot>
          )}
          {hasChrome || isRegion ? (
            <div
              ref={isRegion ? regionContent : undefined}
              css={[
                hasChrome ? styles.middle : styles.contentTakesLayout,
                isRegion && styles.content,
              ]}
            >
              {children}
            </div>
          ) : (
            children
          )}
          {hasEndChrome && (
            <ChromeSlot
              ref={endChromeRef}
              isRegion={isRegion}
              css={[
                isHorizontal ? styles.chromeInlineEnd : styles.chromeBlockEnd,
                endChromeCss,
              ]}
            >
              {endChrome}
            </ChromeSlot>
          )}
        </OptionalEffectCarrier>
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
        isShown={startMask && showStartMask}
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

interface ChromeSlotProps {
  ref: Ref<HTMLDivElement>;
  isRegion: boolean;
  css: StyleProp;
  children: ReactNode;
}

/**
 * The slot is in the carrier of the region, so in a Scroll region it sticks
 * to the region's scroller and not to the page.
 */
function ChromeSlot({ ref, isRegion, css, children }: ChromeSlotProps) {
  const sticky = useEffectSticky();
  const { ref: stickyRef, css: stickyCss } = sticky;
  return (
    <div
      ref={mergeRefs(ref, isRegion ? stickyRef : undefined)}
      css={[
        styles.chrome,
        isRegion && styles.chromeOverEffects,
        css,
        isRegion && stickyCss,
      ]}
    >
      <OptionalEffectCarrier value={isRegion ? sticky : null}>
        {children}
      </OptionalEffectCarrier>
    </div>
  );
}
