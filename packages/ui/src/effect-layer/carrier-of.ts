import { bandedCarrier } from "./banded-carrier.ts";
import type { CarrierKey } from "./resolve-carrier.ts";
import type { Carrier } from "./types.ts";
import { viewportCarrier } from "./viewport-carrier.ts";

/**
 * The carrier that `key` names: the banded carrier of the page or of a
 * Scroll region, or the viewport carrier from its top or its bottom edge.
 *
 * @internal
 */
export function carrierOf(key: CarrierKey): Carrier {
  return key === "fixed" || key === "fixedBottom"
    ? viewportCarrier(key)
    : bandedCarrier(key);
}
