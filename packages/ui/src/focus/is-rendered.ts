/**
 * Whether the element draws a box, read from the computed styles of the
 * element and of its ancestors. It replaces `Element.checkVisibility` in a
 * browser that does not have that method, and in jsdom, which has no layout.
 *
 * The `contentVisibilityAuto` option has no effect. Only a layout can tell
 * which `content-visibility: auto` subtree the browser skips.
 *
 * @see https://drafts.csswg.org/cssom-view/#dom-element-checkvisibility
 *
 * @internal
 */
export function isRendered(
  element: Element,
  options: CheckVisibilityOptions,
): boolean {
  let node: Element | null = element;
  while (node !== null) {
    const style = getComputedStyle(node);
    if (style.display === "none") return false;
    if (options.visibilityProperty === true && style.visibility === "hidden") {
      return false;
    }
    const parent: HTMLElement | null = node.parentElement;
    // A closed `<details>` renders its first summary and hides the rest.
    if (
      parent instanceof HTMLDetailsElement &&
      !parent.open &&
      node !== parent.querySelector(":scope > summary")
    ) {
      return false;
    }
    node = parent;
  }
  return true;
}
