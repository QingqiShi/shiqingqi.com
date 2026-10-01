/**
 * Watches the viewport for everything that moves an element against it, and
 * returns the teardown: every scroll, anywhere on the page, and every resize of
 * the window. Calls are coalesced to one per animation frame, so a reader can
 * measure the DOM in it.
 *
 * Internal helper — not part of the package's public API.
 *
 * @internal
 */
export function observeViewport(onChange: () => void) {
  // Momentum scrolling delivers events faster than the compositor paints, so
  // reading per event would force a document-wide layout each time. Scroll
  // fires before the frame's rendering step, so this still lands in the same
  // paint.
  let frame = 0;
  const schedule = () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };

  // Capture phase, so a scroller inside the page reports too: its scroll event
  // does not bubble.
  document.addEventListener("scroll", schedule, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", schedule);

  return () => {
    document.removeEventListener("scroll", schedule, { capture: true });
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
  };
}
