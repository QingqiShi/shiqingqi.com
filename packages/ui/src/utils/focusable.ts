// `:not([tabindex="-1"])` guards every branch, not just the bare `[tabindex]`
// one: a roving-tabindex group parks `-1` on all but one of its members, and
// focus must never land somewhere Tab cannot bring the visitor back to.
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Focusable descendants in document order, skipping anything inside `[inert]`. */
export function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.closest("[inert]"));
}
