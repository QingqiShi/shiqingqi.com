import { createContext } from "react";
import { PAGE_SCOPE } from "./plan-scopes.ts";

/**
 * The scope that the effect hooks under it register in: the scope of the
 * nearest `EffectContainer` above them, or `PAGE_SCOPE`.
 *
 * @internal
 */
export const EffectScopeContext = createContext(PAGE_SCOPE);

let lastScope = PAGE_SCOPE;

/**
 * A scope that no Effect container on this page holds yet.
 *
 * @internal
 */
export function allocateScope() {
  lastScope += 1;
  return lastScope;
}
