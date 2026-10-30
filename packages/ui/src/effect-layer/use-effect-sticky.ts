import * as stylex from "@stylexjs/stylex";
import { use, useState, type RefCallback } from "react";
import { layer } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import type {
  EffectRegistry,
  StickyRegistration,
} from "./create-effect-registry.ts";
import {
  allocateSticky,
  EffectCarrierContext,
  EffectContainedContext,
  onRegionScrollers,
  scrollerOf,
} from "./effect-carrier-context.ts";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { watchStuck } from "./observe-stuck.ts";
import type { EffectCarrierRef } from "./resolve-carrier.ts";

/** A sticky box as `useEffectSticky` returns it. */
export interface EffectSticky {
  /** The ref for the sticky box. */
  readonly ref: RefCallback<Element>;
  /**
   * Whether the box is stuck now. The `<canvas>` element of its effects
   * follows the same state.
   */
  readonly isStuck: boolean;
  /**
   * Styles for the sticky box, after its own. While the box is not stuck,
   * they put it on the plane right under the scroll `<canvas>` elements, so
   * the effects of its controls show. While it is stuck, and inside
   * `<EffectCarrier value="contained">`, they are empty, and the box's own
   * `zIndex` applies: `layer.raised` for sticky chrome.
   */
  readonly css: StyleProp;
  /** @internal */
  readonly carrier: EffectCarrierRef;
}

/**
 * Makes a `position: sticky` box an Effect carrier, and gives it its plane.
 * Attach `ref` to the sticky box, compose `css` after the box's own styles,
 * and wrap the box's content in `<EffectCarrier value={sticky}>`:
 *
 * ```tsx
 * const sticky = useEffectSticky();
 * const { ref, css } = sticky;
 * <div ref={ref} css={[styles.bar, css]}>
 *   <EffectCarrier value={sticky}>{children}</EffectCarrier>
 * </div>
 * ```
 *
 * One stuck watch gives the plane and the carrier. While the box is stuck,
 * the effects of the elements in it draw with the viewport, and the box is
 * on its own plane. When it lets go, they draw with the page again, and the
 * box goes down right under the page's effects. A scroll moves the effects
 * with the compositor, and the layer does not measure the elements again on
 * each scroll. Only the one frame in which the box sticks or lets go is
 * late.
 *
 * The box sticks to the scroller of the Scroll region that it is in, from
 * the carrier context, or else to the page. The stuck watch reads the box
 * against that scroller, and a stuck box in a region draws on the carrier
 * around the region. A box that is fixed at one breakpoint and sticky at
 * another can use it too:
 * while it is fixed, it counts as stuck. The effect hooks of the box itself
 * are on its sticky carrier too. The stuck watch and the plane work also
 * without an `EffectLayerProvider`. Inside `<EffectCarrier value="contained">`,
 * the box is not a carrier, and it always has its own plane.
 */
export function useEffectSticky(): EffectSticky {
  const registry = use(EffectLayerContext);
  const parent = use(EffectCarrierContext);
  const isContained = use(EffectContainedContext);
  const [carrier, setCarrier] = useState(
    (): EffectCarrierRef & { kind: "sticky" } => ({
      kind: "sticky",
      id: allocateSticky(),
      parent,
    }),
  );
  const [isStuck, setIsStuck] = useState(false);
  // The descendants compare carriers by identity, so keep this one until the
  // parent changes.
  if (carrier.parent !== parent) {
    setCarrier({ ...carrier, parent });
  }
  // A box that holds its sticky descendants makes this box stick to it, not
  // to the page. Thus, the box is not a carrier there.
  const ref = stickyRef(isContained ? null : registry, carrier, setIsStuck);
  // A contained box is a stacking context, so a plane in it cannot go under
  // the effects. The box keeps its own plane, as its fixed and sticky
  // neighbours in the box do.
  return {
    ref,
    isStuck,
    css: isStuck || isContained ? null : styles.unstuck,
    carrier,
  };
}

function stickyRef(
  registry: EffectRegistry | null,
  carrier: EffectCarrierRef & { kind: "sticky" },
  setIsStuck: (stuck: boolean) => void,
): RefCallback<Element> {
  return (element) => {
    if (element === null) {
      return undefined;
    }
    let registration: StickyRegistration | null = null;
    const onChange = (stuck: boolean) => {
      setIsStuck(stuck);
      registration?.changed();
    };
    let scroller = scrollerOf(carrier.parent);
    let watch = watchStuck(element, onChange, scroller);
    registration =
      registry?.registerSticky(element, carrier, () => watch.isStuck()) ?? null;
    setIsStuck(watch.isStuck());
    const stopScrollers = onRegionScrollers(() => {
      const next = scrollerOf(carrier.parent);
      if (next !== scroller) {
        scroller = next;
        const wasStuck = watch.isStuck();
        watch.disconnect();
        watch = watchStuck(element, onChange, scroller);
        // A new watch starts as not stuck, and tells only when the box is
        // stuck.
        if (wasStuck && !watch.isStuck()) {
          onChange(false);
        }
      }
    });
    return () => {
      stopScrollers();
      registration?.remove();
      watch.disconnect();
    };
  };
}

const styles = stylex.create({
  unstuck: {
    zIndex: `calc(${layer.effect} - 1)`,
  },
});
