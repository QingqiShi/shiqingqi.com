import { useEffect, useRef, useState } from "react";
import { observeViewport } from "../utils/observe-viewport.ts";

/**
 * Whether the element is holding at the offset it sticks at, so the chrome
 * inside it knows when to blur the page around itself. The peer of
 * `usePageScrolled` for chrome that sticks partway down the page rather than
 * floating over all of it.
 *
 * The offset is measured from the padding edge of the nearest scrolling
 * ancestor rather than from the viewport, so a row inside an inner scroller
 * reports stuck as soon as it holds there.
 *
 * An element with no box — display none at this breakpoint — is never stuck.
 *
 * @returns `{ ref, isStuck }`; put the ref on the sticky element.
 *
 * @internal
 */
export function useStuck() {
  const ref = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;

    let scroller: HTMLElement | null = null;
    let offset = 0;
    // A breakpoint or an `env()` inset changes both, and only a resize changes
    // a breakpoint or an inset — so a scroll frame never re-reads them.
    let isStale = true;
    const invalidate = () => {
      isStale = true;
    };

    const update = () => {
      const rect = box.getBoundingClientRect();
      // Read first, and nothing else after it: a bar that this breakpoint
      // hides holds nowhere, and pays for no further measurement.
      if (rect.height === 0) {
        setIsStuck(false);
        return;
      }

      if (isStale) {
        isStale = false;
        scroller = scrollingAncestor(box);
        const top = Number.parseFloat(getComputedStyle(box).top);
        offset = Number.isNaN(top) ? 0 : top;
      }

      const scrollerTop =
        scroller === null
          ? 0
          : scroller.getBoundingClientRect().top + scroller.clientTop;
      // Half a pixel of slack either side, because a sticky box lands on its
      // offset a subpixel short of it as often as exactly on it. Further above
      // it, the end of its containing block is pushing the row out, and it
      // moves with the page again.
      setIsStuck(Math.abs(rect.top - scrollerTop - offset) <= 0.5);
    };

    update();

    window.addEventListener("resize", invalidate);
    const unobserveViewport = observeViewport(update);

    return () => {
      window.removeEventListener("resize", invalidate);
      unobserveViewport();
    };
  }, []);

  return { ref, isStuck };
}

/**
 * The nearest ancestor that scrolls its content, or `null` when nothing does
 * and the element sticks against the viewport.
 */
function scrollingAncestor(element: HTMLElement): HTMLElement | null {
  for (
    let parent = element.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
  }
  return null;
}
