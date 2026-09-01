import type { NavLeg } from "@/data/types";

/**
 * Collapse a day's single-hop legs into one ordered list of stops for an
 * overview route. A leg whose `from` is omitted (current location) inherits the
 * previous leg's destination, and consecutive identical points are de-duped, so
 * a chain like N17→Gatwick, Gatwick→Cambridge becomes [N17, Gatwick, Cambridge].
 */
export function dayRoutePoints(legs: NavLeg[]) {
  const points: string[] = [];
  for (const leg of legs) {
    const last = points.at(-1);
    const from = leg.from ?? last;
    if (from && from !== last) points.push(from);
    for (const waypoint of leg.waypoints ?? []) {
      if (waypoint !== points.at(-1)) points.push(waypoint);
    }
    if (leg.to !== points.at(-1)) points.push(leg.to);
  }
  return points;
}
