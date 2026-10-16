import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import type { EffectSettings } from "./types.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIQUID = roleBits(["liquid"]);
const GRABBER_SETTINGS: EffectSettings = {
  liquid: EFFECT_SETTING_DEFAULTS.liquid,
};

/**
 * Draws a Sheet's grabber bar as liquid on the effect layer while the card
 * moves or a finger holds it, as the `grabber` prop of the Sheet
 * describes. Attach the returned ref to the grabber, the box a drag takes
 * hold of, mark the bar inside it with `data-liquid-grabber`, and publish
 * the Sheet's pose on the grabber with `publishSheetPose` each time the
 * card is placed: the effect reads the bar's size and colour, the card's
 * colour under it, how the card moves from where the grabber is each
 * frame, and the finger from the pose. While the effect draws, the grabber
 * has the `data-effect-drawn` attribute, so the bar inside it hides then
 * and at no other time; the grabber itself keeps its box. Outside an
 * `EffectLayerProvider`, or where the effect layer is off, the ref does
 * nothing.
 */
export function useLiquidGrabber() {
  return useEffectRegistration(LIQUID, GRABBER_SETTINGS);
}
