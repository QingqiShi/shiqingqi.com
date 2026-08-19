import { useEffect, useState } from "react";

/**
 * Tracks whether the page is scrolled away from its top edge, so fixed chrome
 * can carry a Scroll mask over the content passing beneath it. The peer of
 * `useScrollMask` for the one scroll region that has no element to observe:
 * the page scrolls through the window, so the position comes from
 * `window.scrollY` and the listener sits on the window.
 *
 * Only the start edge. A page ends at its footer, in flow at the bottom of the
 * document, and nothing scrolls under it — so there is no end mask to track.
 */
export function usePageScrollMask() {
  const [showStartMask, setShowStartMask] = useState(false);

  useEffect(() => {
    const update = () => {
      setShowStartMask(Math.round(window.scrollY) > 0);
    };

    // Read once on mount: a reload or a back navigation restores the scroll
    // position before the effect runs, and the mask has to match it.
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  return { showStartMask };
}
