import {
  MAX_NEIGHBOURS,
  MAX_PULSES,
  type RippleInstanceRecord,
} from "./create-ripples.ts";
import { isLightBackdrop, rippleColor } from "./ripple-color.ts";
import type { RippleInstance } from "./ripple-layout.ts";
import type { EffectFrame, EffectInput } from "./types.ts";

/** The most a ring covers the page, on a light page and on a dark one. */
const PEAK_ALPHA = { light: 0.55, dark: 0.95 } as const;

type Vec4 = readonly [number, number, number, number];
const NO_RING: Vec4 = [0, 0, 0, 0];

/**
 * `ripples[index]` for one instance. Each ring takes its element's fill, set
 * against the backdrop of its scope.
 *
 * @internal
 */
export function rippleInstanceValue(
  { elementIndex, rings, neighbours }: RippleInstanceRecord,
  { elements, scopes }: Pick<EffectFrame, "elements" | "scopes">,
): EffectInput<typeof RippleInstance> {
  const { fill, scopeIndex } = elements[elementIndex];
  const { backdrop } = scopes[scopeIndex];
  const peak = isLightBackdrop(backdrop) ? PEAK_ALPHA.light : PEAK_ALPHA.dark;
  const wakes = new Array<number>(MAX_PULSES).fill(0);
  const ringValues = new Array<Vec4>(MAX_PULSES).fill(NO_RING);
  let extent = 0;
  for (const [slot, ring] of rings.entries()) {
    wakes[slot] = ring.wake;
    ringValues[slot] = [ring.front, ring.amount, ring.aimX, ring.aimY];
    extent = Math.max(extent, ring.front);
  }
  const neighbourValues = new Array<number>(MAX_NEIGHBOURS).fill(0);
  for (const [slot, neighbour] of neighbours.entries()) {
    neighbourValues[slot] = neighbour;
  }
  return {
    element: elementIndex,
    ringCount: rings.length,
    neighbourCount: neighbours.length,
    extent,
    alpha: peak * Math.sqrt(fill[3]),
    color: rippleColor(fill, backdrop),
    wakes,
    neighbours: neighbourValues,
    rings: ringValues,
  };
}
