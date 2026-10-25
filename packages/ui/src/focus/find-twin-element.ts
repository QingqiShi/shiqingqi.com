/**
 * The element itself while it is in the document. Else the element that
 * took its place when a list drew its rows again: the one with the same
 * `id`, or the link in `root` with the same `href`. Gives focus back to the
 * element that opened a sheet or a column.
 */
export function findTwinElement(
  element: HTMLElement,
  root: ParentNode = element.ownerDocument,
): HTMLElement | null {
  if (element.isConnected) return element;
  const byId = element.id
    ? element.ownerDocument.getElementById(element.id)
    : null;
  if (byId !== null) return byId;
  const href = element.getAttribute("href");
  if (href === null) return null;
  return (
    [...root.querySelectorAll<HTMLElement>("a[href]")].find(
      (anchor) => anchor.getAttribute("href") === href,
    ) ?? null
  );
}
