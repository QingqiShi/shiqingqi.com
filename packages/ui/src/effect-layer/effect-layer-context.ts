import { createContext } from "react";
import type { EffectCanvas, Effect } from "./types.ts";

/**
 * Adds one use of an effect to the nearest effect layer and returns the
 * function that removes that use, or `null` outside an
 * `EffectLayerProvider`.
 *
 * @internal
 */
export const EffectLayerContext = createContext<
  ((effect: Effect, canvas: EffectCanvas) => () => void) | null
>(null);
