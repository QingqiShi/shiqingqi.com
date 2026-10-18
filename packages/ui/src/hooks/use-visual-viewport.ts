import { useSyncExternalStore } from "react";

/** The part of the document that the visitor sees, in whole px. */
export interface VisibleArea {
  /** The top of the visible area, down from the top of the document. */
  readonly top: number;
  readonly height: number;
}

type ViewportReading = Pick<VisualViewport, "height" | "pageTop" | "scale">;

let snapshot: VisibleArea | null = null;
let subscribers = 0;

function layoutViewport(): ViewportReading {
  return { height: window.innerHeight, pageTop: window.scrollY, scale: 1 };
}

function getSnapshot() {
  const viewport = window.visualViewport ?? layoutViewport();
  // A zoomed page keeps the last area, so that a box placed from it stays
  // where it was. A page that is zoomed before the first read takes the
  // layout viewport, which is the best place it has.
  const isZoomed = viewport.scale > 1.01;
  if (isZoomed && snapshot) return snapshot;
  // iOS can keep `offsetTop` after the keyboard closes, so the top comes
  // from `pageTop`.
  const reading = isZoomed ? layoutViewport() : viewport;
  const top = Math.round(reading.pageTop);
  const height = Math.round(reading.height);
  if (snapshot?.top !== top || snapshot.height !== height) {
    snapshot = { top, height };
  }
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  subscribers++;
  viewport?.addEventListener("resize", onChange);
  viewport?.addEventListener("scroll", onChange);
  window.addEventListener("resize", onChange);
  window.addEventListener("scroll", onChange, { passive: true });
  return () => {
    viewport?.removeEventListener("resize", onChange);
    viewport?.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    window.removeEventListener("scroll", onChange);
    subscribers--;
    if (subscribers === 0) snapshot = null;
  };
}

/**
 * The visual viewport in document coordinates: the part of the page that the
 * visitor sees, without an on-screen keyboard or the browser's toolbars. Use
 * it to place an absolute box at what the visitor sees, such as a sheet above
 * the keyboard. It is null on the server.
 *
 * The area can go past the end of the document: iOS can scroll the visual
 * viewport there to show a focused field.
 */
export function useVisualViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
