/**
 * Whether a click opens the link in place, with no key and no other button.
 * A click that is not plain stays with the browser, which opens the link in a
 * new tab or window.
 */
export function isPlainClick(
  event: Pick<
    MouseEvent,
    "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
  >,
) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
