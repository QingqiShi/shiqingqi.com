import { use, useEffect } from "react";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { roleBits, type EffectRole } from "./effect-roles.ts";

/**
 * Gets the effects of `roles` ready while the component is mounted, before
 * any element has them: the layer requests its GPU device and builds the
 * effects' pipelines, but mounts no `<canvas>` element and draws nothing.
 * Use it where an effect must show at once when an element first joins it,
 * such as a burst of dust on the first press. A role is named as its hook
 * is, less `use`: `["dust"]` for `useDust`. Outside an
 * `EffectLayerProvider` it does nothing.
 */
export function usePrepareEffects(roles: readonly EffectRole[]) {
  const registry = use(EffectLayerContext);
  const bits = roleBits(roles);
  useEffect(() => registry?.prepare(bits), [registry, bits]);
}
