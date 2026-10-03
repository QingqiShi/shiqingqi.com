import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const ON_INTERACTION = roleBits(["ripple"]);
const AMBIENT = roleBits(["ripple", "rippleAmbient"]);

export interface RippleOptions {
  /**
   * Also pulse on a slow beat while on screen, as well as on hover, press
   * and focus. Every ambient element on the page shares the beat, so they
   * pulse together. Use it for one element that asks for attention, not for
   * decoration.
   *
   * @default false
   * @zh 除悬停、按下与聚焦之外，元素在屏幕上时还按缓慢的节拍自行脉动。页面上所有自行脉动的元素共用同一个节拍，因此会一起脉动。只用于一个需要引起注意的元素，不要用作装饰。
   */
  ambient?: boolean;
}

/**
 * Pulses an element's background colour out from its edge in rings that
 * slow down and fade as they spread, drawn on the effect layer behind the
 * page: attach the returned ref to the element. The pointer coming over the
 * element starts a pulse that leans towards it, a press starts a full one
 * that also sets off rippling neighbours, and keyboard focus starts an even
 * one. Rings fade out before the edges of other registered elements. Under
 * reduced motion no ring travels; a still ring marks hover, focus and a
 * press instead. The element needs a box of its own, so not
 * `display: contents`, and draws no ring without a background colour.
 * Outside an `EffectLayerProvider`, or without WebGPU, the ref does nothing.
 */
export function useRipple({ ambient = false }: RippleOptions = {}) {
  return useEffectRegistration(ambient ? AMBIENT : ON_INTERACTION, NO_SETTINGS);
}
