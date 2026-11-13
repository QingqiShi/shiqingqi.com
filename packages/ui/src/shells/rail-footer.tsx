"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode, type RefCallback } from "react";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import type { StyleProp } from "../types.ts";
import { sidebarEdge, tabViewForm } from "./tab-view.stylex.ts";

/**
 * The `footer` at the bottom of the rail of a `TabView`. It is fixed to the
 * bottom of the viewport, and an empty box of its size keeps its room at the
 * end of the rail.
 *
 * @internal
 */
export function RailFooter({
  css,
  children,
}: {
  css?: StyleProp;
  children: ReactNode;
}) {
  const [blockSize, setBlockSize] = useState(0);
  const measure: RefCallback<HTMLDivElement> = (element) => {
    if (element === null || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      setBlockSize(element.offsetHeight);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  };
  return (
    <>
      <div aria-hidden css={[styles.room, dynamicStyles.room(blockSize)]} />
      <div ref={measure} css={[css, styles.footer]}>
        <EffectCarrier value="viewport-bottom">{children}</EffectCarrier>
      </div>
    </>
  );
}

const styles = stylex.create({
  room: {
    display: { default: "block", "@media print": "none" },
    flexShrink: 0,
    marginBlockStart: "auto",
  },
  // The rail is as tall as `100dvh`. Safari on an iPad collapses the bar at
  // its top while the page scrolls, and it changes `dvh` only after that
  // motion ends, so the bottom of the rail jumps then. The bottom of the
  // viewport does not move, so the footer is fixed to it, at the place that
  // it has at the end of the rail. It has no inline inset, so it stays at the
  // inline start of the content of the rail. A fixed box prints on each page,
  // so the footer is in the flow in print.
  footer: {
    position: { default: "fixed", "@media print": "static" },
    insetBlockEnd: sidebarEdge.paddingBlockEnd,
    inlineSize: `calc(${tabViewForm.inlineSize} - 2 * ${tabViewForm.paddingInline})`,
    marginBlockStart: "auto",
  },
});

const dynamicStyles = stylex.create({
  room: (blockSize: number) => ({ blockSize: `${String(blockSize)}px` }),
});
