import { useEffect, useState } from "react";

/**
 * Tracks whether the page is scrolled away from its top edge, so the chrome
 * floating over it knows when to blur the page around itself. The peer of
 * `useScrollMask` for the one scroll region that has no element to observe:
 * the page scrolls through the window, so the position comes from
 * `window.scrollY` and the listener sits on the window.
 *
 * Only the top edge. A page ends at its footer, in flow at the bottom of the
 * document, and nothing floats over it there.
 */
export function usePageScrolled() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsScrolled(Math.round(window.scrollY) > 0);
    };

    // Read once on mount: a reload or a back navigation restores the scroll
    // position before the effect runs, and the blur has to match it.
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  return { isScrolled };
}
