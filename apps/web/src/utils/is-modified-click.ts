/**
 * A mouse-click event carries a modifier when the user holds Meta/Ctrl/Shift/Alt
 * or uses a non-primary button (e.g. middle-click). Browsers treat these as
 * "open the link's href in a new tab/window" gestures on a real `<a href>`, so
 * a link that hijacks the click to drive client-side state must let them fall
 * through to native navigation instead.
 */
export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}
