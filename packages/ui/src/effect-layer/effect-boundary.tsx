"use client";

import type { ReactElement } from "react";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import { NO_ROLES } from "./effect-roles.ts";

interface EffectBoundaryProps {
  /**
   * The one element to register. It keeps its own place in the layout: the
   * boundary adds no box around it. It needs a box of its own, so not
   * `display: contents`.
   *
   * @zh 要登记的那一个元素。它在布局中的位置保持不变：边界不会在它外面多加一个盒子。它需要有自己的盒子，因此不能是 `display: contents`。
   */
  children: ReactElement;
}

/**
 * Registers its child element on the effect layer, so that effects can draw
 * around it. The layer measures the element's border box, its corner radii
 * and its `background-color` each frame it draws, so they follow scrolling,
 * layout shifts, theme changes and hover. `?effects=debug` draws what it
 * measured. Outside an `EffectLayerProvider` it renders its child and nothing
 * more. Inside a list or a table, where a wrapper is not valid markup, use
 * `useEffectBoundary` on the element instead.
 */
export function EffectBoundary({ children }: EffectBoundaryProps) {
  return <EffectBoundarySlot roles={NO_ROLES}>{children}</EffectBoundarySlot>;
}
