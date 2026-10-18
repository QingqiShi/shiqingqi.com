import { use, useState, type RefCallback } from "react";
import type { EffectRegistry } from "./create-effect-registry.ts";
import {
  allocateRegion,
  EffectCarrierContext,
  EffectContainedContext,
  setRegionScroller,
} from "./effect-carrier-context.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import type { EffectCarrierRef } from "./resolve-carrier.ts";

/**
 * A Scroll region as `useScrollRegion` returns it: the ref for the
 * scroller, the ref for its content box, and the Effect carrier it
 * declares, for `EffectCarrier`.
 */
export interface ScrollRegionRef {
  /** Attach to the scroller: the box with `overflow: auto` or `scroll`. */
  readonly scroller: RefCallback<Element>;
  /**
   * Attach to the content box: one in-flow box with `position: relative`
   * in the scroller, which holds all of the scrolled content.
   */
  readonly content: RefCallback<Element>;
  /** @internal */
  readonly carrier: EffectCarrierRef;
}

/**
 * Makes a scroller a Scroll region, so that the effects of the elements in
 * it move with its scroll: attach `scroller` to the scroller and `content`
 * to its content box, and wrap the content in
 * `<EffectCarrier value={region}>`.
 *
 * ```tsx
 * const region = useScrollRegion();
 * const { scroller, content } = region;
 * <div ref={scroller} css={styles.scroller}>
 *   <div ref={content} css={styles.content}>
 *     <EffectCarrier value={region}>{children}</EffectCarrier>
 *   </div>
 * </div>
 * ```
 *
 * The content box must have `position: relative`, must hold all of the
 * scrolled content, and must not be the scroller. The effect layer puts the
 * region's `<canvas>` elements at the end of the content box, under
 * `layer.effect`, so they cover that box and scroll with it. A scroll then
 * measures nothing. The region takes part in the stacking context around
 * it: chrome in the scroller that must stay over the effects needs
 * `layer.raised`. The scroll is vertical; a region that scrolls only
 * horizontally keeps its elements on the parent carrier. The effect hooks of
 * the scroller itself are on the parent carrier. A sticky box in the region
 * sticks to the scroller, so `useEffectSticky` watches it against the
 * scroller. Inside `<EffectCarrier value="contained">`, the refs do
 * nothing. Outside an `EffectLayerProvider`, they give the scroller only to
 * that watch.
 */
export function useScrollRegion(): ScrollRegionRef {
  const registry = use(EffectLayerContext);
  const parent = use(EffectCarrierContext);
  const isContained = use(EffectContainedContext);
  const [carrier, setCarrier] = useState(
    (): EffectCarrierRef & { kind: "region" } => ({
      kind: "region",
      id: allocateRegion(),
      parent,
    }),
  );
  // The descendants compare carriers by identity, so keep this one until the
  // parent changes.
  if (carrier.parent !== parent) {
    setCarrier({ ...carrier, parent });
  }
  return regionRefs(isContained ? null : registry, carrier);
}

function regionRefs(
  registry: EffectRegistry | null,
  carrier: EffectCarrierRef & { kind: "region" },
): ScrollRegionRef {
  const register = (part: "scroller" | "content", element: Element) =>
    registry?.registerRegion(carrier.id, carrier.parent, part, element);
  const contentRef = (element: Element | null) =>
    element === null ? undefined : register("content", element);
  const scrollerRef = (element: Element | null) => {
    if (element === null) {
      return undefined;
    }
    setRegionScroller(carrier.id, element);
    const unregister = register("scroller", element);
    return () => {
      setRegionScroller(carrier.id, null);
      unregister?.();
    };
  };
  return { scroller: scrollerRef, content: contentRef, carrier };
}
