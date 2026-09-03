import { useLayoutEffect, type RefObject } from "react";
import { space } from "../../tokens.stylex.ts";

/**
 * Caps a Sheet to the room left under the bar it hangs from, remeasured while
 * a sticky bar slides. Writes to the node, not state, so scrolling does not
 * re-render the popup, and the cap survives close — otherwise the Sheet would
 * snap to full height mid-animation.
 *
 * @internal
 */
export function useSheetCap({
  frameRef,
  popupRef,
  isSheet,
  isMenuShown,
}: {
  frameRef: RefObject<HTMLElement | null>;
  popupRef: RefObject<HTMLElement | null>;
  isSheet: boolean;
  isMenuShown: boolean;
}) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const popup = popupRef.current;
    if (!isSheet || !isMenuShown || !frame || !popup) return;

    const measure = () => {
      const { top } = frame.getBoundingClientRect();
      popup.style.maxBlockSize = `calc(100dvh - ${String(top)}px - ${space._3} - env(safe-area-inset-bottom))`;
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [frameRef, popupRef, isMenuShown, isSheet]);
}
