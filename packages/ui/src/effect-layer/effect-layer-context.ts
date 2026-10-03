import { createContext } from "react";
import type { EffectRegistry } from "./create-effect-registry.ts";

/**
 * Registers an element on the nearest effect layer with a set of role bits
 * and the settings of their effects, or is `null` outside an
 * `EffectLayerProvider`.
 *
 * @internal
 */
export const EffectLayerContext = createContext<
  EffectRegistry["register"] | null
>(null);
