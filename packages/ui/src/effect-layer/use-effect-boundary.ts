import { use, useCallback } from "react";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { NO_ROLES, roleBits, type EffectRole } from "./effect-roles.ts";

export interface EffectBoundaryOptions {
  /** The jobs the element has in effects. Without one, effects only see it. */
  roles?: readonly EffectRole[];
}

/**
 * Registers one element on the effect layer, the hook under
 * `EffectBoundary`: attach the returned ref to the element. While it stays
 * attached, the layer measures the element each frame it draws — its border
 * box, its corner radii and its `background-color` — so effects can draw
 * around it. Outside an `EffectLayerProvider` the ref does nothing.
 */
export function useEffectBoundary({
  roles = NO_ROLES,
}: EffectBoundaryOptions = {}) {
  const register = use(EffectLayerContext);
  const bits = roleBits(roles);
  return useCallback(
    (element: Element | null): (() => void) | undefined =>
      element === null || register === null
        ? undefined
        : register(element, bits),
    [register, bits],
  );
}
