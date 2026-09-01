import type { NavLeg, TravelMode } from "@/data/types";

/**
 * Mode for the day-overview route. Driving whenever the day has a driving leg
 * (the road-trip days); walking otherwise — a no-car city day is better drawn
 * on foot. Unlike transit, walking supports the waypoints the overview chains
 * together and routes through pedestrian-only stops (e.g. Tate Modern), which
 * a driving route rejects.
 */
export function dayRouteMode(legs: NavLeg[]): TravelMode {
  return legs.some((leg) => (leg.mode ?? "driving") === "driving")
    ? "driving"
    : "walking";
}
