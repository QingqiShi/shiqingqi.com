import { createContext } from "react";
import { PAGE_CARRIER, type EffectCarrierRef } from "./resolve-carrier.ts";

/**
 * The Effect carrier that the effect hooks under it register on: the one
 * that the nearest `EffectCarrier` above them declares, or the page.
 *
 * @internal
 */
export const EffectCarrierContext =
  createContext<EffectCarrierRef>(PAGE_CARRIER);

/**
 * Whether a box above holds the fixed and sticky boxes inside it, as
 * `<EffectCarrier value="contained">` declares. Under such a box, each
 * `EffectCarrier` keeps the carrier around that box.
 *
 * @internal
 */
export const EffectContainedContext = createContext(false);

let lastSticky = 0;

/**
 * An id that no sticky carrier on this page has yet.
 *
 * @internal
 */
export function allocateSticky() {
  lastSticky += 1;
  return lastSticky;
}
