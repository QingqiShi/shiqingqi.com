"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import type { StyleProp } from "@tuja/ui/types";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { springScrollTo } from "./principles/spring-scroll-to.ts";

interface PropAnchorsProps {
  css?: StyleProp;
  children: ReactNode;
}

/**
 * The box around a props table. A press on a link to a row springs the page
 * there, as the links on the Principles page do, and then sets the fragment,
 * so the row becomes the target, marks itself and opens. Without JavaScript,
 * the links jump there.
 */
export function PropAnchors({ css, children }: PropAnchorsProps) {
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);
  const scroller = useSplitViewColumn()?.scroller ?? null;

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const opensElsewhere =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;
    if (opensElsewhere || !(event.target instanceof Element)) return;
    const href = event.target.closest("a")?.getAttribute("href");
    if (href == null || !href.startsWith("#") || href === "#") return;
    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (target === null) return;
    event.preventDefault();
    stopRef.current?.();
    const { finished, stop } = springScrollTo(target, scroller);
    stopRef.current = stop;
    void finished.then((isThere) => {
      if (stopRef.current === stop) stopRef.current = null;
      if (!isThere) return;
      // The same fragment fires no event, and the row may have closed since.
      if (window.location.hash === href) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = href;
      }
    });
  };

  return (
    <div css={css} onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}
