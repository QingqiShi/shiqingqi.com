import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const EXTRACTOR_FAN = roleBits(["extractorFan"]);

export interface ExtractorFanOptions {
  /**
   * How far from its edge the element pulls dust in, in CSS px. The pull is
   * strongest at the edge and fades out towards this distance.
   *
   * @default 400
   * @zh 元素从多远的地方把灰尘吸进来，以 CSS px 计，从边缘量起。吸力在边缘处最强，到这个距离时逐渐消失。
   */
  reach?: number;
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
}: ExtractorFanOptions = {}) {
  return useEffectRegistration(EXTRACTOR_FAN, { extractorFan: { reach } });
}
