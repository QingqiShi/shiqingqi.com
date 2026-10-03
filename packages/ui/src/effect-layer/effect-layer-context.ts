import { createContext } from "react";

/**
 * Registers an element on the nearest effect layer with a set of role bits,
 * and returns the function that removes it again, or is `null` outside an
 * `EffectLayerProvider`.
 *
 * @internal
 */
export const EffectLayerContext = createContext<
  ((element: Element, roles: number) => () => void) | null
>(null);
