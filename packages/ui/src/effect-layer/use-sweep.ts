import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const SWEEP = roleBits(["sweep"]);

/**
 * Lets an element sweep on the effect layer: attach the returned ref to the
 * element, and dispatch `dispatchSweep` on it when its state changes. As
 * the flood from that point reaches the element's edge, a ring light runs
 * once around its outline, a little outside the edge, as a comet with a
 * fading tail, in the element's fill colour. `Switch` does this with
 * `effect="sweep"`. Under reduced motion no comet runs; a still glow marks
 * the change instead. The element needs a box of its own, so not
 * `display: contents`, and draws no light without a background colour.
 * Outside an `EffectLayerProvider`, or without WebGPU, the ref does nothing.
 */
export function useSweep() {
  return useEffectRegistration(SWEEP, NO_SETTINGS);
}
