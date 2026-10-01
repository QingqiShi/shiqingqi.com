import { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";

/** The registry indexed by path, for the two lookups that read one route. */
export const DESIGN_SYSTEM_ROUTE_BY_PATH = new Map(
  DESIGN_SYSTEM_ROUTES.map((route) => [route.path, route]),
);
