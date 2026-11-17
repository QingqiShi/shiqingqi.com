import { useEffect, useEffectEvent } from "react";

// The width of the edge where the split view of `@tuja/ui` starts its swipe
// back (`EDGE_SWIPE_ZONE`).
const EDGE_SWIPE_ZONE = 24;

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.matches("input, textarea, select, [role=combobox]"))
  );
}

/** The address that a plain press on a link leads to, when it is another page of the app. */
function linkTarget(event: MouseEvent): string | null {
  if (event.button !== 0 || event.defaultPrevented) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const link =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
    return null;
  }
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return null;
  return url.pathname === window.location.pathname
    ? null
    : url.pathname + url.search + url.hash;
}

/**
 * While `isHeld`, the ways out of the screen that the page can stop do not
 * leave it. A link, Esc and the left arrow call `onHeld` with the address
 * that the person asked for, or null for the way back. The swipe back does
 * not start, and the browser asks before it closes or reloads the tab. The
 * Back button of the browser cannot be stopped.
 */
export function useLeaveGuard(
  isHeld: boolean,
  onHeld: (href: string | null) => void,
) {
  const hold = useEffectEvent(onHeld);
  useEffect(() => {
    if (!isHeld) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const onClick = (event: MouseEvent) => {
      const href = linkTarget(event);
      if (href === null) return;
      stop(event);
      hold(href);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "ArrowLeft") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      // A sheet or a menu that is open has its own use for these keys.
      if (document.querySelector("[aria-modal=true], [role=menu]") !== null) {
        return;
      }
      stop(event);
      hold(null);
    };
    // The split view listens for the press that starts its swipe back on an
    // element above the screen. A press that stops at the document does not
    // get to it.
    const onPointerDown = (event: PointerEvent) => {
      const column =
        event.target instanceof Element
          ? event.target.closest('[data-split-view-column="content"]')
          : null;
      if (column === null) return;
      const fromEdge = event.clientX - column.getBoundingClientRect().left;
      if (fromEdge <= EDGE_SWIPE_ZONE) event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
    };
  }, [isHeld]);
}
