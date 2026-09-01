import { DESIGN_SYSTEM_ROUTE_BY_PATH } from "./design-system-route-by-path.ts";
import type { DesignSystemPath, DesignSystemSectionId } from "./types.ts";

/**
 * Which section a route belongs to — what a breadcrumb puts between the
 * overview and the page. Pure, so a server page can resolve the section here
 * and its own copy separately.
 */
export function getDesignSystemRouteSection(
  path: DesignSystemPath,
): DesignSystemSectionId {
  // The fallback is unreachable while `path` comes from the route map, which
  // the type says and a `Map` lookup cannot; `overview` carries no crumb, so
  // an impossible path loses a level rather than naming the wrong one.
  return DESIGN_SYSTEM_ROUTE_BY_PATH.get(path)?.section ?? "overview";
}
