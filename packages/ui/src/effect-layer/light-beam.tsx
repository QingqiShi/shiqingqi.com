"use client";

import type { ReactElement } from "react";
import { BLACK_HOLE_ATTRIBUTES } from "./black-hole-attributes.ts";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import type { EffectRole } from "./effect-roles.ts";

const ROLES: readonly EffectRole[] = ["lightBeam"];

interface LightBeamProps {
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
  /**
   * The one element that casts the beam, from its centre. It keeps its own
   * place in the layout, and it needs a box of its own, so not
   * `display: contents`. Its `background-color` gives the light its colour.
   *
   * @zh 从中心投出光束的那一个元素。它在布局中的位置保持不变，并且需要有自己的盒子，因此不能是 `display: contents`。它的 `background-color` 决定光的颜色。
   */
  children: ReactElement;
}

/**
 * Makes its child element a Light beam on the effect layer: a ray of light
 * in its fill colour, cast behind the page from its centre, that each
 * `BlackHole` bends. On a dark page the light brightens what it crosses; on
 * a light page it tints it. Outside an `EffectLayerProvider`, or where the
 * effect layer is off, it renders its child and nothing more.
 */
export function LightBeam({
  angle,
  followsPointer = true,
  children,
}: LightBeamProps) {
  return (
    <EffectBoundarySlot
      roles={ROLES}
      attributes={{
        [BLACK_HOLE_ATTRIBUTES.angle]: angle?.toString(),
        [BLACK_HOLE_ATTRIBUTES.followsPointer]: String(followsPointer),
      }}
    >
      {children}
    </EffectBoundarySlot>
  );
}
