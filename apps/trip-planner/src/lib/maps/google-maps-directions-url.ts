import type { TravelMode } from "@/data/types";

/**
 * Build a Google Maps *directions* deep-link that opens with the route
 * preloaded. `origin` omitted = Maps uses the device's current location.
 * Usually a single hop (one origin, one destination) so the link drops the
 * user straight onto the next leg; pass `waypoints` for a leg that should route
 * through intermediate stops in one navigation (e.g. roadside rest stops on a
 * long drive), each of which the user can skip in the Maps UI.
 */
export function googleMapsDirectionsUrl({
  origin,
  destination,
  waypoints = [],
  mode = "driving",
}: {
  origin?: string;
  destination: string;
  waypoints?: string[];
  mode?: TravelMode;
}) {
  const params = new URLSearchParams({ api: "1", travelmode: mode });
  if (origin) params.set("origin", origin);
  params.set("destination", destination);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
