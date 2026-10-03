import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const BLACK_HOLE = roleBits(["blackHole"]);

export interface BlackHoleOptions {
  /**
   * How strongly it bends light, as a multiple of the mass its size gives
   * it. At 1, light from straight behind its centre shows as a ring a little
   * outside its edge. At 0 it bends nothing. Clamped to 0–4.
   *
   * @default 1
   * @zh 它弯折光线的强度，以其尺寸所给质量的倍数表示。为 1 时，从它中心正后方射来的光会在边缘外不远处显现为一道光环；为 0 时不弯折任何光线。取值限制在 0–4 之间。
   */
  mass?: number;
}

/**
 * Makes an element a Black hole on the effect layer: attach the returned ref
 * to the element. Light that a `useLightBeam` element casts behind it bends
 * around its edges, and light from straight behind its centre shows as a
 * ring around it. A larger element bends light more, and the bends of
 * several Black holes add up. The element needs a box of its own, so not
 * `display: contents`; give it a background, so that it covers the light
 * behind it. Outside an `EffectLayerProvider`, or where the effect layer is
 * off, the ref does nothing.
 */
export function useBlackHole({
  mass = EFFECT_SETTING_DEFAULTS.blackHole.mass,
}: BlackHoleOptions = {}) {
  return useEffectRegistration(BLACK_HOLE, { blackHole: { mass } });
}
