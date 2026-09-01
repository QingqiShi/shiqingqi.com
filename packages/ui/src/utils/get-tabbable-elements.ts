import { isFocusable } from "./is-focusable.ts";

// The elements the HTML spec makes focusable with no tabindex attribute, plus
// every element that a tabindex attribute can make focusable.
const CANDIDATE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "iframe",
  "details > summary:first-of-type",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
].join(", ");

// HTML parses tabindex with its rules for parsing integers: whitespace and a
// sign first, then digits, and it ignores the text after the digits.
const INTEGER_PATTERN = /^[\t\n\f\r ]*([+-]?\d+)/;

// Read the attribute, not the `tabIndex` property. The property has a
// different default for each tag, and browsers do not agree on the defaults.
function tabindexOf(element: Element) {
  const attribute = element.getAttribute("tabindex");
  if (attribute === null) return 0;
  const parsed = INTEGER_PATTERN.exec(attribute);
  return parsed === null ? 0 : Number(parsed[1]);
}

type RadioGroups = Map<HTMLFormElement | null, Map<string, HTMLInputElement[]>>;

/**
 * Every named radio in tree order, grouped by form owner and then by name.
 * The scan starts at the root, not at `container`, because a group can reach
 * outside the container through a form owner.
 */
function radioGroupsIn(container: HTMLElement): RadioGroups {
  const groups: RadioGroups = new Map();
  const root = container.getRootNode();
  if (!(
    root instanceof Document ||
    root instanceof DocumentFragment ||
    root instanceof Element
  )) {
    return groups;
  }
  for (const radio of root.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]',
  )) {
    if (radio.name === "") continue;
    let byName = groups.get(radio.form);
    if (byName === undefined) {
      byName = new Map<string, HTMLInputElement[]>();
      groups.set(radio.form, byName);
    }
    const members = byName.get(radio.name);
    if (members === undefined) byName.set(radio.name, [radio]);
    else members.push(radio);
  }
  return groups;
}

// A radio group gets one stop in the tab order. The spec leaves the order to
// platform conventions, so this follows what the browsers do.
function isTabbableRadio(radio: HTMLInputElement, groups: RadioGroups) {
  const group = groups.get(radio.form)?.get(radio.name) ?? [];
  if (group.length === 0) return true;
  const checked = group.find((member) => member.checked);
  return checked === undefined ? group[0] === radio : checked === radio;
}

/**
 * Descendants of `container` in the HTML spec's sequential focus navigation
 * order — the elements Tab stops on, in the order Tab reaches them.
 *
 * Elements that Tab cannot reach are left out: a negative tabindex, an
 * `:disabled` control (which covers a disabled `<fieldset>` and its legend
 * carve-out), an `[inert]` subtree, anything that does not render, and every
 * radio in a group but the one that holds the group's stop.
 *
 * @see https://html.spec.whatwg.org/multipage/interaction.html#focusable-area
 * @see https://html.spec.whatwg.org/multipage/interaction.html#sequential-focus-navigation
 *
 * @internal
 */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const candidates: { element: HTMLElement; tabindex: number }[] = [];
  // Both scans are shared by the whole pass, and each runs only if the DOM
  // holds the element that needs it.
  const usemapImages = new Map<Node, Map<string, Element>>();
  let radioGroups: RadioGroups | null = null;

  for (const element of container.querySelectorAll<HTMLElement>(
    CANDIDATE_SELECTOR,
  )) {
    const tabindex = tabindexOf(element);
    if (tabindex < 0) continue;
    if (!isFocusable(element, usemapImages)) continue;
    if (element instanceof HTMLInputElement && element.type === "radio") {
      radioGroups ??= radioGroupsIn(container);
      if (!isTabbableRadio(element, radioGroups)) continue;
    }
    candidates.push({ element, tabindex });
  }

  // A positive tabindex comes before every zero one, lowest value first. Sort
  // is stable, so elements that share a value stay in tree order.
  const positive = candidates
    .filter((candidate) => candidate.tabindex > 0)
    .sort((a, b) => a.tabindex - b.tabindex);
  const zero = candidates.filter((candidate) => candidate.tabindex === 0);
  return [...positive, ...zero].map((candidate) => candidate.element);
}
