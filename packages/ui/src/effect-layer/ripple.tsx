"use client";

import type { ReactElement } from "react";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import type { EffectRole } from "./effect-roles.ts";

const ON_INTERACTION: readonly EffectRole[] = ["ripple"];
const AMBIENT: readonly EffectRole[] = ["ripple", "rippleAmbient"];

interface RippleProps {
  /**
   * The one element whose background colour ripples out. It keeps its own
   * place in the layout, and needs a box of its own, so not
   * `display: contents`. Without a background colour it draws no ring.
   *
   * @zh 背景色向外扩散成涟漪的那一个元素。它在布局中的位置保持不变，并且需要有自己的盒子，因此不能是 `display: contents`。没有背景色时不会绘制涟漪。
   */
  children: ReactElement;
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
 * Pulses its child's background colour out from its edge in rings that slow
 * down and fade as they spread, drawn on the effect layer behind the page.
 * The pointer coming over the element starts a pulse that leans towards it,
 * a press starts a full one that also sets off rippling neighbours, and
 * keyboard focus starts an even one. Rings fade out before the edges of
 * other registered elements. Under reduced motion no ring travels; a still
 * ring marks hover, focus and a press instead. Outside an
 * `EffectLayerProvider`, or without WebGPU, it renders its child and nothing
 * more.
 */
export function Ripple({ children, ambient = false }: RippleProps) {
  return (
    <EffectBoundarySlot roles={ambient ? AMBIENT : ON_INTERACTION}>
      {children}
    </EffectBoundarySlot>
  );
}
