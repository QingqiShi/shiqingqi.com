/**
 * Signed horizontal distance from `child`'s centre to `scrollParent`'s centre,
 * in px (positive means the child sits right of centre). Scrolling the parent
 * by this delta centres the child — which is what `centerInScrollX` does — and
 * its magnitude is how the container demo finds the card nearest the centre.
 */
export function offsetFromScrollCenterX(
  scrollParent: HTMLElement,
  child: HTMLElement,
) {
  const parentRect = scrollParent.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  return (
    childRect.left -
    parentRect.left +
    childRect.width / 2 -
    scrollParent.clientWidth / 2
  );
}

/**
 * Scrolls `scrollParent` horizontally so `child` sits in the middle of it.
 *
 * Shared by the container- and viewport-scale demos, which both need to bring
 * an active item into the centre of a horizontal scroll rail. Pass the desired
 * `behavior` — `"auto"` for layout-following (resize) and the result of
 * `getScrollBehavior()` for user gestures that should respect reduced-motion.
 */
export function centerInScrollX(
  scrollParent: HTMLElement,
  child: HTMLElement,
  behavior: ScrollBehavior,
) {
  scrollParent.scrollTo({
    left:
      scrollParent.scrollLeft + offsetFromScrollCenterX(scrollParent, child),
    behavior,
  });
}
