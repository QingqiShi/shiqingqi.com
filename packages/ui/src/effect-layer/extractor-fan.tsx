"use client";

import type { ReactElement } from "react";
import { DUST_ATTRIBUTES } from "./dust-attributes.ts";
import { EffectBoundarySlot } from "./effect-boundary-slot.tsx";
import type { EffectRole } from "./effect-roles.ts";

const EXTRACTOR_FAN_ROLES: readonly EffectRole[] = ["extractorFan"];

interface ExtractorFanProps {
  /**
   * How far from its edge the element pulls dust in, in CSS px. The pull is
   * strongest at the edge and fades out towards this distance.
   *
   * @default 400
   * @zh 元素从多远的地方把灰尘吸进来，以 CSS px 计，从边缘量起。吸力在边缘处最强，到这个距离时逐渐消失。
   */
  reach?: number;
  /**
   * The one element that pulls dust in. It keeps its own place in the
   * layout, and it needs a box of its own, so not `display: contents`.
   *
   * @zh 吸入灰尘的那一个元素。它在布局中的位置保持不变；它需要有自己的盒子，因此不能是 `display: contents`。
   */
  children: ReactElement;
}

/**
 * Pulls in the dust that `Dust` elements shed, like an extractor fan: dust
 * in reach speeds up towards its child element and vanishes at its edge. An
 * element can be both, nested in either order; it does not pull in its own
 * dust. Outside an `EffectLayerProvider` it renders its child and nothing
 * more.
 */
export function ExtractorFan({
  reach = DUST_ATTRIBUTES.reach.fallback,
  children,
}: ExtractorFanProps) {
  return (
    <EffectBoundarySlot
      roles={EXTRACTOR_FAN_ROLES}
      attributes={{ [DUST_ATTRIBUTES.reach.name]: reach }}
    >
      {children}
    </EffectBoundarySlot>
  );
}
