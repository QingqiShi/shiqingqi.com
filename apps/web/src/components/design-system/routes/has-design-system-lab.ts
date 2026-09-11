import { DESIGN_SYSTEM_ROUTE_BY_PATH } from "./design-system-route-by-path.ts";
import type { DesignSystemPath } from "./types.ts";

/**
 * Whether a route has a Lab beside its documentation. The page header reads
 * this to decide whether to offer the view switch at all.
 */
export function hasDesignSystemLab(path: DesignSystemPath): boolean {
  return DESIGN_SYSTEM_ROUTE_BY_PATH.get(path)?.lab === true;
}
