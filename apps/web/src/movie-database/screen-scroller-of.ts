/**
 * The box that scrolls the screen around `element`: the column of the
 * `NavigationStack` where the screen is wide enough to scroll by itself, and
 * the page on a phone.
 */
export function screenScrollerOf(element: Element | null): HTMLElement {
  for (
    let box = element?.parentElement ?? null;
    box !== null && box !== document.body;
    box = box.parentElement
  ) {
    const { overflowY } = getComputedStyle(box);
    if (overflowY === "auto" || overflowY === "scroll") return box;
  }
  return document.documentElement;
}

/** What sends the scroll events of `scroller`: the window for the page. */
export function scrollEventTargetOf(scroller: HTMLElement) {
  return scroller === document.documentElement ? window : scroller;
}
