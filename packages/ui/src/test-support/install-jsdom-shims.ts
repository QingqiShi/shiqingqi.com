type ContentEditableState = "true" | "plaintext-only" | "false" | "inherit";

/**
 * The `contenteditable` state of the element itself. It is an enumerated
 * attribute, so its keywords are ASCII case-insensitive, an empty value is the
 * true state, and anything else falls back to the inherit state.
 *
 * @see https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable
 */
function contentEditableStateOf(element: Element): ContentEditableState {
  const value = element.getAttribute("contenteditable");
  if (value === null) return "inherit";
  const keyword = value.toLowerCase();
  if (keyword === "" || keyword === "true") return "true";
  if (keyword === "plaintext-only") return "plaintext-only";
  if (keyword === "false") return "false";
  return "inherit";
}

/**
 * Whether the element is an editing host or a descendant of one, which is what
 * `isContentEditable` reports.
 *
 * @see https://html.spec.whatwg.org/multipage/interaction.html#editing-host
 */
function isEditingHostOrEditable(element: HTMLElement): boolean {
  // Design mode makes every element in the document an editing host.
  if (element.ownerDocument.designMode === "on") return true;
  // The nearest ancestor that sets a state decides, because the false state
  // blocks the inheritance an editing host would otherwise pass down.
  for (
    let node: HTMLElement | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const state = contentEditableStateOf(node);
    if (state !== "inherit") return state !== "false";
  }
  return false;
}

// `contentVisibilityAuto` is not modelled, because jsdom has no
// `content-visibility` and no layout to say which subtree it skips.
function isRendered(element: Element, options: CheckVisibilityOptions) {
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

/**
 * Adds the DOM members jsdom leaves out but the components under test read.
 * Call it once from a Vitest setup file.
 *
 * - `Element.prototype.checkVisibility`, answered from the computed styles,
 *   because jsdom has no layout.
 * - `HTMLElement.prototype.isContentEditable`, which jsdom does not define at
 *   all, answered from the HTML spec's editing-host rules.
 */
export function installJsdomShims() {
  Element.prototype.checkVisibility = function checkVisibility(
    this: Element,
    options: CheckVisibilityOptions = {},
  ) {
    return isRendered(this, options);
  };

  Object.defineProperty(HTMLElement.prototype, "isContentEditable", {
    configurable: true,
    enumerable: true,
    get(this: HTMLElement) {
      return isEditingHostOrEditable(this);
    },
  });
}
