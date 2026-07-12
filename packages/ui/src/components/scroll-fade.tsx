"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  useScrollFades,
  type ScrollFadeOrientation,
} from "../hooks/use-scroll-fades.ts";
import { space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";

interface ScrollFadeProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /**
   * Scroll axis. `"vertical"` fades the top and bottom edges; `"horizontal"`
   * fades the start and end edges.
   * @default "vertical"
   */
  orientation?: ScrollFadeOrientation;
  /**
   * Depth of the fade at each scrollable edge. Any CSS length.
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
 * A scroll container whose content fades out toward the edges it can still
 * scroll to, cueing that more sits beyond. The fade is a mask, so it dissolves
 * the content itself over whatever is behind it — a border, a sticky header, a
 * footer, a canvas or a surface — with no knowledge of the background colour,
 * unlike a gradient panel that has to be painted to match its surface. Each
 * edge fades only once there is scrolled-away content in that direction, so a
 * container resting at the start shows no start fade.
 *
 * Forwards a `ref` and native `div` attributes (`role`, `aria-*`, `tabIndex`,
 * `onScroll`, …), so a consumer can name the region, measure the element, or
 * scroll it imperatively while ScrollFade keeps ownership of the overflow and
 * the fade.
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

  const towardEnd = orientation === "horizontal" ? "to right" : "to bottom";
  // A collapsed (0px) stop leaves that edge fully opaque, so each end fades
  // only while there is content hidden past it. Black vs. transparent are the
  // mask's opaque/cut keywords — the colour value is irrelevant.
  const startStop = showStartFade ? fadeSize : "0px";
  const endStop = showEndFade ? fadeSize : "0px";
  const mask = `linear-gradient(${towardEnd}, transparent 0, #000 ${startStop}, #000 calc(100% - ${endStop}), transparent 100%)`;

  return (
    <div
      {...rest}
      ref={mergeRefs(scrollRef, forwardedRef)}
      className={className}
      style={{
        ...style,
        maskImage: mask,
        WebkitMaskImage: mask,
        // The default mask-clip (border-box) would also clip a focusable
        // consumer's focus ring, which is an `outline` painted OUTSIDE the
        // border box. no-clip lets that ring show; the gradient still fades the
        // content, and overflow still clips the scrolled-away content.
        maskClip: "no-clip",
      }}
      css={[
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        css,
      ]}
    >
      {children}
    </div>
  );
}

const styles = stylex.create({
  vertical: {
    overflowX: "hidden",
    overflowY: "auto",
    minBlockSize: 0,
  },
  horizontal: {
    overflowX: "auto",
    overflowY: "hidden",
    minInlineSize: 0,
  },
});
