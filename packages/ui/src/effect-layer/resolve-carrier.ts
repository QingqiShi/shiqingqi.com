/**
 * The Effect carrier that an element declares: what its effects move with.
 * `page` is the default: the content of the page, which the scroll `<canvas>`
 * elements cover. `viewport` is the viewport, from its top or its bottom
 * edge. `region` is the content of a Scroll region on the carrier `parent`.
 * `sticky` is a sticky box: while it is stuck, the elements in it move with
 * the carrier around the scroller that it sticks to, and else with its
 * parent carrier.
 *
 * @internal
 */
export type EffectCarrierRef =
  | { readonly kind: "page" }
  | { readonly kind: "viewport"; readonly edge: "top" | "bottom" }
  | {
      readonly kind: "region";
      readonly id: number;
      readonly parent: EffectCarrierRef;
    }
  | {
      readonly kind: "sticky";
      readonly id: number;
      readonly parent: EffectCarrierRef;
    };

/**
 * The carrier that the elements on a declared carrier draw on now, which
 * names its `<canvas>` elements: `"page"` for the two scroll ones of the
 * page, `"fixed"` for the viewport, `"fixedBottom"` for the viewport's bottom
 * edge, or the id of a Scroll region for the two scroll ones of that region.
 *
 * @internal
 */
export type CarrierKey = "page" | "fixed" | "fixedBottom" | number;

/**
 * The carriers that every frame has, in this order before its Scroll
 * regions.
 *
 * @internal
 */
export const FIXED_CARRIER_KEYS: readonly CarrierKey[] = [
  "page",
  "fixed",
  "fixedBottom",
];

/**
 * What a carrier resolves against now: whether the sticky carrier `id` is
 * stuck, and whether the Scroll region `id` has its scroller and its content
 * box. Until it has both, the elements on a region draw on its parent.
 *
 * @internal
 */
export interface CarrierState {
  readonly isStuck: (id: number) => boolean;
  readonly hasRegion: (id: number) => boolean;
}

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
 * The Scroll region whose scroll moves a carrier: `"page"`, the id of a
 * region, or `null` for the viewport. A sticky box on the carrier sticks to
 * the scroller of this region.
 *
 * @internal
 */
export function scrollRegionOf(
  ref: EffectCarrierRef,
  hasRegion: (id: number) => boolean,
): "page" | number | null {
  switch (ref.kind) {
    case "page":
      return "page";
    case "viewport":
      return null;
    case "region":
      return hasRegion(ref.id) ? ref.id : scrollRegionOf(ref.parent, hasRegion);
    case "sticky":
      return scrollRegionOf(ref.parent, hasRegion);
  }
}

/**
 * The carrier that the elements on a carrier draw on now. A sticky box that
 * is stuck does not move with the scroll that it sticks to, so its elements
 * draw on the carrier around that scroller: the viewport for the page, or
 * the parent of a Scroll region.
 *
 * @internal
 */
export function resolveCarrier(
  ref: EffectCarrierRef,
  state: CarrierState,
): CarrierKey {
  switch (ref.kind) {
    case "page":
      return "page";
    case "viewport":
      return ref.edge === "bottom" ? "fixedBottom" : "fixed";
    case "region":
      return state.hasRegion(ref.id)
        ? ref.id
        : resolveCarrier(ref.parent, state);
    case "sticky":
      return isStuckOnScroll(ref, state)
        ? resolveAroundScroll(ref.parent, state)
        : resolveCarrier(ref.parent, state);
  }
}

function isStuckOnScroll(
  ref: EffectCarrierRef & { kind: "sticky" },
  state: CarrierState,
) {
  return (
    scrollRegionOf(ref.parent, state.hasRegion) !== null &&
    state.isStuck(ref.id)
  );
}

/** The carrier around the scroller that moves the carrier `ref`. */
function resolveAroundScroll(
  ref: EffectCarrierRef,
  state: CarrierState,
): CarrierKey {
  switch (ref.kind) {
    case "page":
      return "fixed";
    case "viewport":
      return resolveCarrier(ref, state);
    case "region":
      return state.hasRegion(ref.id)
        ? resolveCarrier(ref.parent, state)
        : resolveAroundScroll(ref.parent, state);
    case "sticky":
      return resolveAroundScroll(ref.parent, state);
  }
}

/**
 * Every carrier that the elements on a carrier can draw on: the one of each
 * sticky box in the chain, stuck and not stuck.
 *
 * @internal
 */
export function reachableCarriers(
  ref: EffectCarrierRef,
  hasRegion: (id: number) => boolean,
): CarrierKey[] {
  const keys = new Set<CarrierKey>();
  const visit = (stuck: ReadonlySet<number>) => {
    keys.add(
      resolveCarrier(ref, { isStuck: (id) => stuck.has(id), hasRegion }),
    );
  };
  const stickies = stickiesOf(ref);
  // A chain has few sticky boxes, so try each set of them that can stick.
  for (let mask = 0; mask < 1 << stickies.length; mask++) {
    visit(new Set(stickies.filter((_, index) => (mask & (1 << index)) !== 0)));
  }
  return [...keys];
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
    case "region":
    case "sticky":
      return viewportEdgeOf(ref.parent);
  }
}

/**
 * Each sticky carrier in the chain of a carrier, the nearest first.
 *
 * @internal
 */
export function stickyRefsOf(
  ref: EffectCarrierRef,
): (EffectCarrierRef & { readonly kind: "sticky" })[] {
  switch (ref.kind) {
    case "page":
    case "viewport":
      return [];
    case "region":
      return stickyRefsOf(ref.parent);
    case "sticky":
      return [ref, ...stickyRefsOf(ref.parent)];
  }
}

/**
 * The id of each sticky box in the chain of a carrier, the nearest first.
 *
 * @internal
 */
export function stickiesOf(ref: EffectCarrierRef): number[] {
  return stickyRefsOf(ref).map(({ id }) => id);
}

/**
 * The id of each Scroll region in the chain of a carrier, the nearest first.
 *
 * @internal
 */
export function regionsOf(ref: EffectCarrierRef): number[] {
  switch (ref.kind) {
    case "page":
    case "viewport":
      return [];
    case "region":
      return [ref.id, ...regionsOf(ref.parent)];
    case "sticky":
      return regionsOf(ref.parent);
  }
}
