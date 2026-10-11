import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const RING_LIGHT = roleBits(["ringLight"]);

/**
 * Runs one lap of light round an element's outline, drawn on the effect
 * layer, once, when the element arrives: attach the returned ref to the
 * element. A comet sets off from the middle of its inline-start edge, runs
 * all the way round over the top, and slows and fades as it comes back. The
 * light takes the element's `color`, and follows its border box and corner
 * radius. Mount the element when the light should run, such as when a
 * surface has finished arriving; to run it again, mount it again. Under
 * reduced motion no comet runs: a still glow shows round the outline for a
 * moment instead. Outside an `EffectLayerProvider`, or where the effect
 * layer is off, the ref does nothing, so the light must never be the only
 * sign that something happened.
 */
export function useRingLight() {
  return useEffectRegistration(RING_LIGHT, NO_SETTINGS);
}
