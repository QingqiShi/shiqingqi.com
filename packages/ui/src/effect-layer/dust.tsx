"use client";

import type { ReactElement } from "react";
import { DUST_ATTRIBUTES } from "./dust-attributes.ts";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import type { EffectRole } from "./effect-roles.ts";

const DUST_ROLES: readonly EffectRole[] = ["dust"];

interface DustProps {
  /**
   * How much dust the element sheds: particles a second along every 100 px
   * of its edge. It sheds more while an `ExtractorFan` pulls at it or a
   * pointer is near it.
   *
   * @default 3
   * @zh 元素散出灰尘的多少：沿边缘每 100 px 每秒的粒子数。当 `ExtractorFan` 在吸它、或指针靠近它时，散出的灰尘会更多。
   */
  density?: number;
  /**
   * The one element that sheds dust. It keeps its own place in the layout,
   * and it needs a box of its own, so not `display: contents`.
   *
   * @zh 散出灰尘的那一个元素。它在布局中的位置保持不变；它需要有自己的盒子，因此不能是 `display: contents`。
   */
  children: ReactElement;
}

/**
 * Sheds dust from its child element's edge, in the element's own fill
 * colour. The particles float off like dust in still air, then speed up
 * towards any `ExtractorFan` in reach and vanish at its edge; with none in
 * reach they drift and fade. They flow around other registered elements, and
 * a moving pointer stirs them. Under reduced motion they hold still around
 * the element. Outside an `EffectLayerProvider` it renders its child and
 * nothing more.
 */
export function Dust({
  density = DUST_ATTRIBUTES.density.fallback,
  children,
}: DustProps) {
  return (
    <EffectBoundarySlot
      roles={DUST_ROLES}
      attributes={{ [DUST_ATTRIBUTES.density.name]: density }}
    >
      {children}
    </EffectBoundarySlot>
  );
}
