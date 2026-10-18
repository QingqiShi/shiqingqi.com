import { readInsets } from "./read-element-box.ts";
import {
  scrollsWithPage,
  stickiesOf,
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
    /\b(size|inline-size)\b/.test(style.containerType) ||
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

/**
 * The sticky boxes around the element, itself included, that stick to the
 * viewport: no box between one of them and the root element scrolls, and
 * none is fixed. The root element and the body do not count, because the
 * viewport takes their `overflow`.
 *
 * @internal
 */
export function viewportStickyBoxes(
  element: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  const { documentElement, body } = element.ownerDocument;
  let boxes: Element[] = [];
  for (
    let node: Element | null = element;
    node !== null && node !== documentElement && node !== body;
    node = node.parentElement
  ) {
    const style = styleOf(node);
    if (style.position === "fixed") {
      return [];
    }
    if (node !== element && scrolls(style)) {
      boxes = [];
    }
    if (style.position === "sticky") {
      boxes.push(node);
    }
  }
  return boxes;
}

/**
 * What the check reads: the computed styles of the frame, and the box of
 * each sticky carrier.
 *
 * @internal
 */
export interface CarrierCheckContext {
  readonly styleOf: (element: Element) => CSSStyleDeclaration;
  readonly stickyBox: (id: number) => Element | null;
}

const describe = (element: Element) => {
  const id = element.id === "" ? "" : `#${element.id}`;
  const classes = [...element.classList].slice(0, 2).join(" ");
  return `<${element.localName}${id}${classes === "" ? "" : ` class="${classes}"`}>`;
};

/**
 * Why the carrier that an element declares does not agree with where the
 * browser lays the element out, or `null` when it agrees.
 *
 * @internal
 */
export function carrierMismatch(
  element: Element,
  carrier: EffectCarrierRef,
  { styleOf, stickyBox }: CarrierCheckContext,
): string | null {
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
  if (fixedBox === null && edge !== null) {
    return `${name} declares <EffectCarrier value="viewport">, but it scrolls with the page: no fixed box holds it to the viewport.`;
  }
  if (!scrollsWithPage(carrier)) {
    return null;
  }
  const stuckBoxes = viewportStickyBoxes(element, styleOf);
  const undeclared = stuckBoxes.find((box) => !stickyBoxes.includes(box));
  if (undeclared !== undefined) {
    return `${name} is in the sticky box ${describe(undeclared)}, but no useEffectSticky declares it. Its effects lag the scroll.`;
  }
  const lost = stickyBoxes.find(
    (box) =>
      styleOf(box).position === "sticky" &&
      box.contains(element) &&
      !stuckBoxes.includes(box),
  );
  if (lost !== undefined) {
    return `${name} declares the sticky box ${describe(lost)}, but that box sticks to a scroll container, not to the viewport.`;
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
