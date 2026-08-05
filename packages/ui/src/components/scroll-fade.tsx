"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  useScrollFades,
  type ScrollFadeOrientation,
} from "../hooks/use-scroll-fades.ts";
import { space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { scrollFadeContainer, scrollFadeEdge } from "./scroll-fade.stylex.ts";

interface ScrollFadeProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /**
   * Scroll axis. `"vertical"` blurs the top and bottom edges; `"horizontal"`
   * blurs the start and end edges.
   * @default "vertical"
   */
  orientation?: ScrollFadeOrientation;
  /**
   * Depth of the blur at each scrollable edge. Any CSS length.
   * @default "1.5rem"
   */
  fadeSize?: string;
  /**
   * Controlled fade state. Pass BOTH `showStartFade` and `showEndFade` to
   * render the mask from them and skip the component's own scroll tracking —
   * for a consumer that already runs `useScrollFades` to drive sibling chrome
   * (e.g. scroll-to-page buttons) off the same element and wants one source of
   * truth. Omit both (the default) and ScrollFade tracks the scroll position
   * itself.
   */
  showStartFade?: boolean;
  showEndFade?: boolean;
  /**
   * StyleX styles merged over the scroll container's own — the escape hatch for
   * layout (flex sizing, scroll manners, padding). The component supplies the
   * overflow, the shrink-to-scroll min-size, and the fade.
   */
  css?: StyleProp;
}

/**
 * A scroll container that blurs toward the edges it can still scroll to,
 * cueing that more sits beyond, rather than stopping the content dead at a
 * line. The blur is a stack of `backdrop-filter` bands layered over the true
 * edge — it reads what is behind it rather than needing to know the
 * background colour, unlike a gradient panel painted to match its surface.
 * Falls back to the mask-image fade this replaced where `backdrop-filter` is
 * unavailable or `prefers-reduced-transparency` asks for it. Each edge blurs
 * only once there is scrolled-away content in that direction, so a container
 * resting at the start shows no start blur.
 *
 * Forwards a `ref` and native `div` attributes (`role`, `aria-*`, `tabIndex`,
 * `onScroll`, …), so a consumer can name the region, measure the element, or
 * scroll it imperatively while ScrollFade keeps ownership of the overflow and
 * the blur.
 */
export function ScrollFade({
  children,
  orientation = "vertical",
  fadeSize = space._5,
  showStartFade: startFadeProp,
  showEndFade: endFadeProp,
  css,
  className,
  style,
  ref: forwardedRef,
  ...rest
}: ScrollFadeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Controlled when the caller drives both edges — it is already running the
  // hook itself, so ScrollFade's own copy stays disabled to avoid a second set
  // of scroll/resize/mutation observers on the same element.
  const isControlled = startFadeProp !== undefined && endFadeProp !== undefined;
  const tracked = useScrollFades(scrollRef, orientation, {
    enabled: !isControlled,
  });
  const showStartFade = isControlled ? startFadeProp : tracked.showStartFade;
  const showEndFade = isControlled ? endFadeProp : tracked.showEndFade;

  const isHorizontal = orientation === "horizontal";
  // Drives the fallback mask only (bands below skip rendering instead of
  // collapsing) — 0px leaves that edge fully opaque, so it fades only while
  // there is content hidden past it, same as before.
  const startStop = showStartFade ? fadeSize : "0px";
  const endStop = showEndFade ? fadeSize : "0px";

  return (
    <div
      {...rest}
      ref={mergeRefs(scrollRef, forwardedRef)}
      className={className}
      style={style}
      css={[
        isHorizontal
          ? scrollFadeContainer.horizontal
          : scrollFadeContainer.vertical,
        scrollFadeContainer.vars(fadeSize, startStop, endStop),
        css,
      ]}
    >
      {children}
      {showStartFade && (
        <div
          aria-hidden="true"
          css={[
            isHorizontal
              ? scrollFadeEdge.inlineStart
              : scrollFadeEdge.blockStart,
            scrollFadeEdge.vars(isHorizontal ? "to right" : "to bottom"),
          ]}
        >
          <div css={scrollFadeEdge.band_1} />
          <div css={scrollFadeEdge.band_2} />
          <div css={scrollFadeEdge.band_3} />
          <div css={scrollFadeEdge.band_4} />
        </div>
      )}
      {showEndFade && (
        <div
          aria-hidden="true"
          css={[
            isHorizontal ? scrollFadeEdge.inlineEnd : scrollFadeEdge.blockEnd,
            scrollFadeEdge.vars(isHorizontal ? "to left" : "to top"),
          ]}
        >
          <div css={scrollFadeEdge.band_1} />
          <div css={scrollFadeEdge.band_2} />
          <div css={scrollFadeEdge.band_3} />
          <div css={scrollFadeEdge.band_4} />
        </div>
      )}
    </div>
  );
}
