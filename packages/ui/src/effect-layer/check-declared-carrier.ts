import { readInsets } from "./read-element-box.ts";
import {
  scrollRegionOf,
  stickiesOf,
  stickyRefsOf,
  viewportEdgeOf,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

const isSet = (value: string) => value !== "" && value !== "none";
const isAuto = (inset: string) => inset === "auto" || inset === "";

/**
 * Whether a box with this computed style holds its `position: fixed`
 * descendants, so that they scroll with it instead of with the viewport.
 *
 * @internal
 */
export function holdsFixedDescendants(style: CSSStyleDeclaration) {
  return (
    [
      style.transform,
      style.translate,
      style.rotate,
      style.scale,
      style.perspective,
      style.filter,
      style.backdropFilter,
    ].some(isSet) ||
    style.transformStyle === "preserve-3d" ||
    style.contentVisibility === "auto" ||
    /\b(layout|paint|strict|content)\b/.test(style.contain) ||
    /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter)\b/.test(
      style.willChange,
    )
  );
}

/**
 * The `position: fixed` box that fixes the element to the viewport: the
 * element or its nearest ancestor with `position: fixed` that no ancestor
 * holds in the document. `null` when there is none.
 *
 * @internal
 */
export function viewportFixedBox(
  element: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  let box: Element | null = null;
  for (
    let node: Element | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const style = styleOf(node);
    if (box !== null && holdsFixedDescendants(style)) {
      box = null;
    }
    if (box === null && style.position === "fixed") {
      box = node;
    }
  }
  return box;
}

/**
 * Whether a `position: fixed` box is at the bottom edge of the viewport: its
 * `bottom` is set and its `top` is `auto`. When a mobile toolbar slides in
 * or out, the browser moves such a box with the edge before a script can
 * see it move. A browser without a computed style map gives no `auto`, so
 * there no box is at the bottom edge.
 *
 * @internal
 */
export function isAtViewportBottom(
  box: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  const { top, bottom } = readInsets(box, styleOf);
  return isAuto(top) && !isAuto(bottom);
}

/** Whether a box with this computed style is a scroll container. */
function scrolls(style: CSSStyleDeclaration) {
  return [style.overflow, style.overflowX, style.overflowY]
    .flatMap((overflow) => overflow.split(/\s+/).filter(Boolean))
    .some((overflow) => overflow !== "visible" && overflow !== "clip");
}

/** Whether a scroller with this computed style lets a person scroll it. */
function scrollsByHand(overflow: string) {
  return overflow === "auto" || overflow === "scroll";
}

/**
 * The sticky boxes around the element, itself included, that stick to
 * `scroller`, or to the viewport for `null`: no box between one of them and
 * `scroller` scrolls, and none is fixed. The root element and the body do
 * not count, because the viewport takes their `overflow`. `nested` is the
 * nearest box between the element and `scroller` that a person can scroll
 * on the block axis and whose content overflows it, or `null`.
 *
 * @internal
 */
export function stickyBoxesOn(
  element: Element,
  scroller: Element | null,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  const { documentElement, body } = element.ownerDocument;
  let boxes: Element[] = [];
  let nested: Element | null = null;
  for (
    let node: Element | null = element;
    node !== null &&
    node !== documentElement &&
    node !== body &&
    node !== scroller;
    node = node.parentElement
  ) {
    const style = styleOf(node);
    if (style.position === "fixed") {
      return { boxes: [], nested };
    }
    if (node !== element && scrolls(style)) {
      boxes = [];
      if (
        nested === null &&
        scrollsByHand(style.overflowY) &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        nested = node;
      }
    }
    if (style.position === "sticky") {
      boxes.push(node);
    }
  }
  return { boxes, nested };
}

/**
 * The scroller that a sticky box sticks to: its nearest ancestor that is a
 * scroll container, or `null` for the viewport.
 */
function scrollerOfSticky(
  box: Element,
  styleOf: (element: Element) => CSSStyleDeclaration,
) {
  const { documentElement, body } = box.ownerDocument;
  for (
    let node = box.parentElement;
    node !== null && node !== documentElement && node !== body;
    node = node.parentElement
  ) {
    const style = styleOf(node);
    if (scrolls(style)) {
      return node;
    }
    if (style.position === "fixed") {
      return null;
    }
  }
  return null;
}

/** Whether a box has a sticky offset, so that it can stick. */
function hasStickyInset(
  box: Element,
  styleOf: (element: Element) => CSSStyleDeclaration,
) {
  const { top, right, bottom, left } = readInsets(box, styleOf);
  return [top, right, bottom, left].some((inset) => !isAuto(inset));
}

/**
 * What the check reads: the computed styles of the frame, the box of each
 * sticky carrier, the scroller of each Scroll region, and whether an element
 * is in a modal Effect cover.
 *
 * @internal
 */
export interface CarrierCheckContext {
  readonly styleOf: (element: Element) => CSSStyleDeclaration;
  readonly stickyBox: (id: number) => Element | null;
  readonly regionScroller: (id: number) => Element | null;
  readonly hasRegion: (id: number) => boolean;
  readonly isInModalCover: (element: Element) => boolean;
}

const describe = (element: Element) => {
  const id = element.id === "" ? "" : `#${element.id}`;
  const classes = [...element.classList].slice(0, 2).join(" ");
  return `<${element.localName}${id}${classes === "" ? "" : ` class="${classes}"`}>`;
};

/**
 * Why the carrier that an element declares does not agree with where the
 * browser lays the element out, or `null` when it agrees. A modal Effect
 * cover locks the page, so a box in the document in such a cover stays
 * where the viewport is. There, a viewport declaration needs no fixed box.
 *
 * @internal
 */
export function carrierMismatch(
  element: Element,
  carrier: EffectCarrierRef,
  context: CarrierCheckContext,
): string | null {
  const { styleOf, stickyBox, regionScroller, hasRegion, isInModalCover } =
    context;
  const name = describe(element);
  const stickyBoxes = stickiesOf(carrier).flatMap((id) => {
    const box = stickyBox(id);
    return box === null ? [] : [box];
  });
  const edge = viewportEdgeOf(carrier);
  const fixedBox = viewportFixedBox(element, styleOf);
  if (fixedBox !== null && !stickyBoxes.includes(fixedBox)) {
    if (edge === null) {
      return `${name} has a fixed ancestor, but no <EffectCarrier value="viewport"> declares it. Its effects stay where the page was.`;
    }
    if (edge === "top" && isAtViewportBottom(fixedBox, styleOf)) {
      return `${name} is fixed to the bottom edge of the viewport. Declare <EffectCarrier value="viewport-bottom">.`;
    }
    if (edge === "bottom" && isAuto(readInsets(fixedBox, styleOf).bottom)) {
      return `${name} is not fixed to the bottom edge of the viewport. Declare <EffectCarrier value="viewport">.`;
    }
  }
  if (fixedBox === null && edge !== null && !isInModalCover(element)) {
    return `${name} declares <EffectCarrier value="viewport">, but it scrolls with the page: no fixed box holds it to the viewport.`;
  }
  const scroll = scrollRegionOf(carrier, hasRegion);
  if (scroll === null) {
    return null;
  }
  const scroller = scroll === "page" ? null : regionScroller(scroll);
  const { boxes, nested } = stickyBoxesOn(element, scroller, styleOf);
  const undeclared = boxes.find(
    (box) => !stickyBoxes.includes(box) && hasStickyInset(box, styleOf),
  );
  if (undeclared !== undefined) {
    return `${name} is in the sticky box ${describe(undeclared)}, but no useEffectSticky declares it. Its effects lag the scroll.`;
  }
  for (const { id, parent } of stickyRefsOf(carrier)) {
    const box = stickyBox(id);
    const on = scrollRegionOf(parent, hasRegion);
    if (
      box === null ||
      on === null ||
      styleOf(box).position !== "sticky" ||
      !box.contains(element) ||
      !hasStickyInset(box, styleOf)
    ) {
      continue;
    }
    const expected = on === "page" ? null : regionScroller(on);
    const actual = scrollerOfSticky(box, styleOf);
    if (actual !== expected) {
      return actual === null
        ? `${name} declares the sticky box ${describe(box)}, but that box sticks to the viewport, not to its Scroll region.`
        : `${name} declares the sticky box ${describe(box)}, but that box sticks to the scroll container ${describe(actual)}, which no useScrollRegion declares.`;
    }
  }
  if (nested !== null) {
    return `${name} is in the scroller ${describe(nested)}, but no useScrollRegion declares it. Its effects lag the scroll.`;
  }
  return null;
}

const warned = new WeakSet<Element>();

/**
 * Warns one time for each element when the carrier that it declares does
 * not agree with where the browser lays it out. The check only reports. It
 * does not choose a `<canvas>` element. Call it only in development.
 *
 * @internal
 */
export function checkDeclaredCarrier(
  element: Element,
  carrier: EffectCarrierRef,
  context: CarrierCheckContext,
) {
  if (warned.has(element)) {
    return;
  }
  const mismatch = carrierMismatch(element, carrier, context);
  if (mismatch !== null) {
    warned.add(element);
    console.warn(`[effect layer] ${mismatch}`, element);
  }
}
