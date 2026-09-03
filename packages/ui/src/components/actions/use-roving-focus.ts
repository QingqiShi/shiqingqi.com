import { useEffect, type KeyboardEvent, type RefObject } from "react";
import { isFocusable } from "../../utils/is-focusable.ts";

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
 * `preventScroll`, because the popup is a positioned overlay inside whatever
 * scroller the trigger sits in — the default reveal drags that scroller (a
 * sticky sidebar footer nudges its rail on each focus). Only the popup's own
 * scrollport (sheet mode) may move to show the item, and this function scrolls
 * it by hand.
 */
function focusItem(item: HTMLElement, popup: HTMLElement) {
  item.focus({ preventScroll: true });
  const itemRect = item.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  if (itemRect.top < popupRect.top) {
    popup.scrollTop -= popupRect.top - itemRect.top;
  } else if (itemRect.bottom > popupRect.bottom) {
    popup.scrollTop += itemRect.bottom - popupRect.bottom;
  }
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
    if (target) focusItem(target, popup);
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
      focusItem(next, popup);
    } else if (e.key === "ArrowUp") {
      const prev =
        currentIndex === -1
          ? items[items.length - 1]
          : items[(currentIndex - 1 + items.length) % items.length];
      focusItem(prev, popup);
    } else if (e.key === "Home") {
      focusItem(items[0], popup);
    } else {
      focusItem(items[items.length - 1], popup);
    }
  };
}
