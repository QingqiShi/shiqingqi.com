import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const DUST = roleBits(["dust"]);

export interface DustOptions {
  /**
   * How much dust the element sheds: particles a second along every 100 px
   * of its edge. It sheds more while an Extractor fan pulls at it or a
   * pointer is near it.
   *
   * @default 3
   * @zh 元素散出灰尘的多少：沿边缘每 100 px 每秒的粒子数。当抽风机在吸它、或指针靠近它时，散出的灰尘会更多。
   */
  density?: number;
}

/**
 * Sheds dust from an element's edge, in the element's own fill colour:
 * attach the returned ref to the element. The particles float off like dust
 * in still air, then speed up towards any element with `useExtractorFan` in
 * reach and vanish at its edge; with none in reach they drift and fade. They
 * flow around other registered elements, and a moving pointer stirs them.
 * Under reduced motion they hold still around the element. The element needs
 * a box of its own, so not `display: contents`. Outside an
 * `EffectLayerProvider` the ref does nothing.
 */
export function useDust({
  density = EFFECT_SETTING_DEFAULTS.dust.density,
}: DustOptions = {}) {
  return useEffectRegistration(DUST, { dust: { density } });
}
