import { useEffect, useState } from "react";

/**
 * Tracks horizontal scroll position to determine whether left/right
 * fade indicators should be visible. Listens to scroll and resize events.
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
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(el);
    } else {
      requestAnimationFrame(update);
    }

    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [scrollRef]);

  return { showLeftFade, showRightFade };
}
