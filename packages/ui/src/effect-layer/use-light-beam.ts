import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIGHT_BEAM = roleBits(["lightBeam"]);

export interface LightBeamOptions {
  /**
   * Where the beam points while the pointer does not aim it, as a CSS angle:
   * 0 points up and 90 points right, as in `linear-gradient`. Without one, it
   * points at the nearest Black hole, or right when there is none.
   *
   * @zh 指针未瞄准时光束指向的方向，以 CSS 角度表示：0 指向上方，90 指向右方，与 `linear-gradient` 相同。未设置时，它指向最近的黑洞；没有黑洞时指向右方。
   */
  angle?: number;
  /**
   * Turns the beam towards the pointer while the pointer is over the page or
   * a finger touches it, on a spring. Under reduced motion it turns only
   * while the pointer is pressed, with no spring.
   *
   * @default true
   * @zh 指针位于页面上方或手指触摸页面时，光束以弹簧动效转向指针。在减少动态效果模式下，只在按下指针时转向，且没有弹簧动效。
   */
  followsPointer?: boolean;
}

/**
 * Makes an element a Light beam on the effect layer: a ray of light in its
 * fill colour, cast behind the page from its centre, that each Black hole
 * bends. Attach the returned ref to the element. On a dark page the light
 * brightens what it crosses; on a light page it tints it. The element needs
 * a box of its own, so not `display: contents`; its `background-color` gives
 * the light its colour. Outside an `EffectLayerProvider`, or where the
 * effect layer is off, the ref does nothing.
 */
export function useLightBeam({
  angle,
  followsPointer = EFFECT_SETTING_DEFAULTS.lightBeam.followsPointer,
}: LightBeamOptions = {}) {
  return useEffectRegistration(LIGHT_BEAM, {
    lightBeam: { angle, followsPointer },
  });
}
