import { createContext } from "react";
import {
  PAGE_CARRIER,
  regionsOf,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

/**
 * The Effect carrier that the effect hooks under it register on: the one
 * that the nearest `EffectCarrier` above them declares, or the page.
 *
 * @internal
 */
export const EffectCarrierContext =
  createContext<EffectCarrierRef>(PAGE_CARRIER);

/**
 * Whether a box above holds the fixed and sticky boxes inside it, as
 * `<EffectCarrier value="contained">` declares. Under such a box, each
 * `EffectCarrier` keeps the carrier around that box.
 *
 * @internal
 */
export const EffectContainedContext = createContext(false);

let lastSticky = 0;

/**
 * An id that no sticky carrier on this page has yet.
 *
 * @internal
 */
export function allocateSticky() {
  lastSticky += 1;
  return lastSticky;
}

let lastRegion = 0;

/**
 * An id that no Scroll region on this page has yet.
 *
 * @internal
 */
export function allocateRegion() {
  lastRegion += 1;
  return lastRegion;
}

const regionScrollers = new Map<number, Element>();
const scrollerListeners = new Set<() => void>();
let isNotifying = false;

/**
 * Sets the scroller of the Scroll region `id`, or clears it for `null`, so
 * that a sticky box in the region sticks to it. It tells the listeners one
 * time after the current task, after React attaches and detaches all refs of
 * a commit.
 *
 * @internal
 */
export function setRegionScroller(id: number, scroller: Element | null) {
  if (scroller === null) {
    regionScrollers.delete(id);
  } else {
    regionScrollers.set(id, scroller);
  }
  if (!isNotifying) {
    isNotifying = true;
    queueMicrotask(() => {
      isNotifying = false;
      for (const listener of scrollerListeners) {
        listener();
      }
    });
  }
}

/**
 * The scroller that a sticky box on the carrier `ref` sticks to: the
 * scroller of the nearest Scroll region in its chain that has one, or
 * `null` for the viewport.
 *
 * @internal
 */
export function scrollerOf(ref: EffectCarrierRef): Element | null {
  for (const id of regionsOf(ref)) {
    const scroller = regionScrollers.get(id);
    if (scroller !== undefined) {
      return scroller;
    }
  }
  return null;
}

/**
 * Calls `listener` after the scroller of a Scroll region changes, and
 * returns a function that stops it.
 *
 * @internal
 */
export function onRegionScrollers(listener: () => void) {
  scrollerListeners.add(listener);
  return () => {
    scrollerListeners.delete(listener);
  };
}
