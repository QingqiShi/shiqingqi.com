import { useSyncExternalStore } from "react";

/** Less than this between the layout and the visual viewport is a toolbar. */
const KEYBOARD_MIN_HEIGHT = 120;

/** The part of the page that an on-screen keyboard leaves visible. */
interface KeyboardArea {
  /** The top of the visible area, down from the top of the document. */
  readonly top: number;
  readonly height: number;
}

let snapshot: KeyboardArea | null = null;

function getSnapshot() {
  const viewport = window.visualViewport;
  if (!viewport) return null;
  // A pinch zoom also makes the visual viewport shorter.
  if (viewport.scale > 1.01) return snapshot;
  const height = Math.round(viewport.height);
  // Safari on iPadOS makes `innerHeight` shorter with the keyboard, so the
  // layout viewport comes from the root.
  const root = document.documentElement;
  if (root.clientHeight - height <= KEYBOARD_MIN_HEIGHT) {
    snapshot = null;
    return null;
  }
  // The browser scrolls the page to its end to show a field in a bar at the
  // foot of the screen, so the visible area ends where the page ends. The top
  // is read only when the keyboard changes, because a page that follows each
  // scroll moves under the finger.
  if (snapshot?.height !== height) {
    snapshot = { top: root.scrollHeight - height, height };
  }
  return snapshot;
}

function getServerSnapshot() {
  return null;
}

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    viewport?.removeEventListener("resize", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/** What an on-screen keyboard leaves of the page, or null with no keyboard. */
export function useKeyboardArea() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
