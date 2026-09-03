import { useEffect, type KeyboardEvent, type RefObject } from "react";
import { isFocusable } from "../utils/is-focusable.ts";

/**
 * Returns the popup's roving stops in tree order, skipping items `focus()`
 * cannot reach (not rendered, inert, or natively disabled). An `aria-disabled`
 * item stays navigable, per the WAI-ARIA APG for composite widgets.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls
 */
function getMenuItems(popup: HTMLElement) {
  return [...popup.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
    (item) => isFocusable(item),
  );
}

/**
 * The menu keyboard model. On open it moves focus into the popup, preferring
 * the item flagged `data-menu-autofocus="true"` over the first one; it returns
 * the Arrow/Home/End handler for the element that wraps the popup.
 *
 * @internal
 */
export function useRovingFocus({
  popupRef,
  isMenuShown,
  enabled,
}: {
  popupRef: RefObject<HTMLElement | null>;
  isMenuShown: boolean;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!isMenuShown || !enabled) return;
    const popup = popupRef.current;
    if (!popup) return;
    const items = getMenuItems(popup);
    const target =
      items.find((item) => item.dataset.menuAutofocus === "true") ??
      items.at(0);
    target?.focus();
  }, [popupRef, isMenuShown, enabled]);

  return (e: KeyboardEvent<HTMLElement>) => {
    if (!enabled || !isMenuShown) return;
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "Home" &&
      e.key !== "End"
    ) {
      return;
    }

    const popup = popupRef.current;
    if (!popup) return;
    const items = getMenuItems(popup);
    if (items.length === 0) return;

    e.preventDefault();
    e.stopPropagation();

    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    );

    if (e.key === "ArrowDown") {
      const next =
        currentIndex === -1
          ? items[0]
          : items[(currentIndex + 1) % items.length];
      next.focus();
    } else if (e.key === "ArrowUp") {
      const prev =
        currentIndex === -1
          ? items[items.length - 1]
          : items[(currentIndex - 1 + items.length) % items.length];
      prev.focus();
    } else if (e.key === "Home") {
      items[0].focus();
    } else {
      items[items.length - 1].focus();
    }
  };
}
