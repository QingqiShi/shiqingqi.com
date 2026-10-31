import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const EXTRACTOR_FAN = roleBits(["extractorFan"]);

export interface ExtractorFanOptions {
  /**
   * How far from its edge the element pulls dust in, in CSS px. The pull is
   * strongest at the edge and fades out towards this distance. At 0 it
   * pulls nothing, and the element is an Effect boundary until the reach
   * goes up.
   *
   * @default 400
   * @zh 元素从多远的地方把灰尘吸进来，以 CSS px 计，从边缘量起。吸力在边缘处最强，到这个距离时逐渐消失。
   */
  reach?: number;
  /**
   * How fast the element pulls dust in, as a multiple of the usual speed,
   * such as 2 for dust that must arrive from far away in a short time.
   *
   * @default 1
   * @zh 元素吸入灰尘的快慢，以常规速度的倍数表示，例如灰尘必须在短时间内从远处到达时设为 2。
   */
  strength?: number;
}

/**
 * Makes an element an Extractor fan, which pulls in the dust that `useDust`
 * elements shed: attach the returned ref to the element. Dust in reach
 * speeds up towards the element and vanishes at its edge. An element can
 * shed dust and pull it in at once; it does not pull in its own dust. The
 * element needs a box of its own, so not `display: contents`. Outside an
 * `EffectLayerProvider` the ref does nothing.
 */
export function useExtractorFan({
  reach = EFFECT_SETTING_DEFAULTS.extractorFan.reach,
  strength = EFFECT_SETTING_DEFAULTS.extractorFan.strength,
}: ExtractorFanOptions = {}) {
  return useEffectRegistration(reach > 0 ? EXTRACTOR_FAN : 0, {
    extractorFan: { reach, strength },
  });
}
