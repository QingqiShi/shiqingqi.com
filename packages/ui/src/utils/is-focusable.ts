/** The roots `querySelectorAll` can run on, which `getRootNode` does not promise. */
type QueryRoot = Document | DocumentFragment | Element;

function asQueryRoot(node: Node): QueryRoot | null {
  return node instanceof Document ||
    node instanceof DocumentFragment ||
    node instanceof Element
    ? node
    : null;
}

// Only an `img[usemap]` in the same root is modelled. An image in another tree
// that uses the map is rare and cannot be reached from here.
function imagesByUsemapIn(node: Node) {
  const images = new Map<string, Element>();
  const root = asQueryRoot(node);
  if (root === null) return images;
  for (const image of root.querySelectorAll("img[usemap]")) {
    const reference = image.getAttribute("usemap");
    if (reference !== null && !images.has(reference)) {
      images.set(reference, image);
    }
  }
  return images;
}

// An `<area>` has no box of its own. The spec puts its shape in the image that
// uses the map, so that image decides whether the shape renders.
function renderTargetOf(
  element: HTMLElement,
  usemapImages: Map<Node, Map<string, Element>>,
) {
  if (!(element instanceof HTMLAreaElement)) return element;
  const map = element.closest("map");
  if (map === null) return null;
  const root = element.getRootNode();
  let images = usemapImages.get(root);
  if (images === undefined) {
    images = imagesByUsemapIn(root);
    usemapImages.set(root, images);
  }
  return images.get(`#${map.name}`) ?? null;
}

/**
 * Whether the platform lets `focus()` land on the element: it is not
 * `:disabled` (which covers a disabled `<fieldset>` and its legend carve-out),
 * it has no `[inert]` ancestor or self, and it renders. Both `checkVisibility`
 * options are on, so a `visibility: hidden` element and a skipped
 * `content-visibility: auto` subtree count as not rendered.
 *
 * It says nothing about the tab order: a `tabindex="-1"` element is focusable.
 *
 * @param usemapImages Cache of the `img[usemap]` scan an `<area>` needs, keyed
 * by root. Pass one across a batch so the scan runs once, not once per area.
 * @see https://html.spec.whatwg.org/multipage/interaction.html#focusable-area
 * @see https://drafts.csswg.org/cssom-view/#dom-element-checkvisibility
 */
export function isFocusable(
  element: HTMLElement,
  usemapImages: Map<Node, Map<string, Element>> = new Map(),
): boolean {
  if (element.matches(":disabled")) return false;
  if (element.closest("[inert]") !== null) return false;
  const renderTarget = renderTargetOf(element, usemapImages);
  return (
    renderTarget !== null &&
    renderTarget.checkVisibility({
      visibilityProperty: true,
      contentVisibilityAuto: true,
    })
  );
}
