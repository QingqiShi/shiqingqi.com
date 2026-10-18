import { createContext } from "react";
import type { EffectRegistry } from "./create-effect-registry.ts";

/**
 * The registry of the nearest effect layer, where the effect hooks register
 * their elements, or `null` outside an `EffectLayerProvider`.
 *
 * @internal
 */
export const EffectLayerContext = createContext<EffectRegistry | null>(null);
