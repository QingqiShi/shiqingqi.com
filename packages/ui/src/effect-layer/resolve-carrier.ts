import type { EffectCanvas } from "./types.ts";

/**
 * The Effect carrier that an element declares: what its effects move with.
 * `page` is the default: the content of the page, which the scroll `<canvas>`
 * elements cover. `viewport` is the viewport, from its top or its bottom
 * edge. `sticky` is a sticky box: while it is stuck, the elements in it move
 * with the viewport, and else with its parent carrier.
 *
 * @internal
 */
export type EffectCarrierRef =
  | { readonly kind: "page" }
  | { readonly kind: "viewport"; readonly edge: "top" | "bottom" }
  | {
      readonly kind: "sticky";
      readonly id: number;
      readonly parent: EffectCarrierRef;
    };

/** @internal */
export const PAGE_CARRIER: EffectCarrierRef = { kind: "page" };
/** @internal */
export const VIEWPORT_CARRIER: EffectCarrierRef = {
  kind: "viewport",
  edge: "top",
};
/** @internal */
export const VIEWPORT_BOTTOM_CARRIER: EffectCarrierRef = {
  kind: "viewport",
  edge: "bottom",
};

/**
 * Whether the page's scroll moves the carrier, so that a sticky box on it
 * sticks to the viewport.
 *
 * @internal
 */
export function scrollsWithPage(ref: EffectCarrierRef): boolean {
  switch (ref.kind) {
    case "page":
      return true;
    case "viewport":
      return false;
    case "sticky":
      return scrollsWithPage(ref.parent);
  }
}

/**
 * The `<canvas>` element that the elements on a carrier draw on now.
 * `isStuck` tells whether a sticky box is stuck now. A sticky box on the
 * page that is stuck moves with the viewport, so its elements draw on the
 * fixed `<canvas>` element.
 *
 * @internal
 */
export function resolveCarrier(
  ref: EffectCarrierRef,
  isStuck: (id: number) => boolean,
): EffectCanvas {
  switch (ref.kind) {
    case "page":
      return "scroll";
    case "viewport":
      return ref.edge === "bottom" ? "fixedBottom" : "fixed";
    case "sticky":
      return scrollsWithPage(ref.parent) && isStuck(ref.id)
        ? "fixed"
        : resolveCarrier(ref.parent, isStuck);
  }
}

/**
 * Every `<canvas>` element that the elements on a carrier can draw on: the
 * one of each sticky box in the chain, stuck and not stuck.
 *
 * @internal
 */
export function carrierCanvases(ref: EffectCarrierRef): EffectCanvas[] {
  if (ref.kind !== "sticky") {
    return [resolveCarrier(ref, () => false)];
  }
  const canvases = carrierCanvases(ref.parent);
  if (scrollsWithPage(ref.parent) && !canvases.includes("fixed")) {
    canvases.push("fixed");
  }
  return canvases;
}

/**
 * The edge of the viewport in the chain of a carrier, or `null` when the
 * chain has no viewport.
 *
 * @internal
 */
export function viewportEdgeOf(ref: EffectCarrierRef): "top" | "bottom" | null {
  switch (ref.kind) {
    case "page":
      return null;
    case "viewport":
      return ref.edge;
    case "sticky":
      return viewportEdgeOf(ref.parent);
  }
}

/**
 * The id of each sticky box in the chain of a carrier, the nearest first.
 *
 * @internal
 */
export function stickiesOf(ref: EffectCarrierRef): number[] {
  return ref.kind === "sticky" ? [ref.id, ...stickiesOf(ref.parent)] : [];
}
