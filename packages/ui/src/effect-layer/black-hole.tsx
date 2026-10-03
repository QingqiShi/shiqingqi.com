"use client";

import type { ReactElement } from "react";
import { BLACK_HOLE_ATTRIBUTES } from "./black-hole-attributes.ts";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import type { EffectRole } from "./effect-roles.ts";

const ROLES: readonly EffectRole[] = ["blackHole"];

interface BlackHoleProps {
  /**
   * How strongly it bends light, as a multiple of the mass its size gives
   * it. At 1, light from straight behind its centre shows as a ring a little
   * outside its edge. At 0 it bends nothing. Clamped to 0–4.
   *
   * @default 1
   * @zh 它弯折光线的强度，以其尺寸所给质量的倍数表示。为 1 时，从它中心正后方射来的光会在边缘外不远处显现为一道光环；为 0 时不弯折任何光线。取值限制在 0–4 之间。
   */
  mass?: number;
  /**
   * The one element that bends light. It keeps its own place in the layout,
   * and it needs a box of its own, so not `display: contents`. Give it a
   * background, so that it covers the light behind it.
   *
   * @zh 弯折光线的那一个元素。它在布局中的位置保持不变，并且需要有自己的盒子，因此不能是 `display: contents`。给它设置背景，让它盖住身后的光。
   */
  children: ReactElement;
}

/**
 * Makes its child element a Black hole on the effect layer. Light that a
 * `LightBeam` casts behind it bends around its edges, and light from straight
 * behind its centre shows as a ring around it. A larger element bends light
 * more, and the bends of several Black holes add up. Outside an
 * `EffectLayerProvider`, or where the effect layer is off, it renders its
 * child and nothing more.
 */
export function BlackHole({ mass = 1, children }: BlackHoleProps) {
  return (
    <EffectBoundarySlot
      roles={ROLES}
      attributes={{ [BLACK_HOLE_ATTRIBUTES.mass]: String(mass) }}
    >
      {children}
    </EffectBoundarySlot>
  );
}
