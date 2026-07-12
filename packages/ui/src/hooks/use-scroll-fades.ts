import { useEffect, useState } from "react";

export type ScrollFadeOrientation = "horizontal" | "vertical";

/**
 * Tracks a scroll container's position on one axis to decide whether the
 * start/end fade indicators should show. `showStartFade` turns true once the
 * content is scrolled away from the start edge (left for horizontal, top for
 * vertical); `showEndFade` stays true while content remains hidden past the end
 * edge. Listens to scroll events, container resizes, and child additions/
 * removals/resizes so `scrollWidth`/`scrollHeight` changes that leave the
 * container's own box unchanged still trigger a remeasure.
 *
 * Pass `{ enabled: false }` to leave the observers unattached and both fades
 * `false` — for a consumer (e.g. `ScrollFade` in controlled mode) that is
 * handed the fade state from elsewhere and must not run a second set of
 * observers on the same element.
 */
export function useScrollFades(
  scrollRef: React.RefObject<HTMLElement | null>,
  orientation: ScrollFadeOrientation = "horizontal",
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const isHorizontal = orientation === "horizontal";
      const scrollStart = isHorizontal ? el.scrollLeft : el.scrollTop;
      const scrollSize = isHorizontal ? el.scrollWidth : el.scrollHeight;
      const clientSize = isHorizontal ? el.clientWidth : el.clientHeight;
      setShowStartFade(Math.round(scrollStart) > 0);
      setShowEndFade(Math.round(scrollStart) + clientSize < scrollSize - 1);
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
      // Also observe each direct child so changes in content size
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
  }, [scrollRef, orientation, enabled]);

  return { showStartFade, showEndFade };
}
