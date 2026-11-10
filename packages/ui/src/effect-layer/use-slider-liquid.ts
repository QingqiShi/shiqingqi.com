import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const SLIDER_LIQUID = roleBits(["sliderLiquid"]);

/**
 * Lets the effect layer draw a Slider's panel as liquid: attach the
 * returned ref to the groove, which needs `data-effect-content`. While
 * `sliderLiquidRuns` holds the groove, the liquid draws the panel over it
 * and bends the groove's content through it, and the groove has
 * `data-effect-drawn`. Outside an `EffectLayerProvider`, or where the
 * effect layer is off, the ref does nothing.
 *
 * @internal
 */
export function useSliderLiquid() {
  return useEffectRegistration(SLIDER_LIQUID, NO_SETTINGS);
}
