import { useEffect, useState } from "react";

/**
 * Tracks horizontal scroll position to determine whether left/right
 * fade indicators should be visible. Listens to scroll events, container
 * resizes, and child additions/removals/resizes so `scrollWidth` changes
 * that leave the container's own box unchanged still trigger a remeasure.
 */
export function useScrollFades(scrollRef: React.RefObject<HTMLElement | null>) {
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeftFade(Math.round(scrollLeft) > 0);
      setShowRightFade(Math.round(scrollLeft) + clientWidth < scrollWidth - 1);
    };

    el.addEventListener("scroll", update, { passive: true });

    // ResizeObserver fires its callback asynchronously after observe(),
    // which handles initial state without a synchronous setState in the effect.
    // Falls back to a rAF-deferred call in environments without ResizeObserver (e.g. jsdom).
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);
      // Also observe each direct child so changes in content width
      // (items streamed in, filmography resolving more credits, etc.)
      // re-trigger the measurement even when the container's own box
      // is unchanged.
      for (const child of el.children) {
        resizeObserver.observe(child);
      }
      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) resizeObserver?.observe(node);
            }
            for (const node of mutation.removedNodes) {
              if (node instanceof Element) resizeObserver?.unobserve(node);
            }
          }
          update();
        });
        mutationObserver.observe(el, { childList: true });
      }
    } else {
      requestAnimationFrame(update);
    }

    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [scrollRef]);

  return { showLeftFade, showRightFade };
}
