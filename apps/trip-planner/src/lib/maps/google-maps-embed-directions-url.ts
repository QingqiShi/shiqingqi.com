import { EMBED_BASE, MAPS_EMBED_KEY } from "./constants";
import type { TravelMode } from "@/data/types";

/**
 * Embed-API URL that previews a route. Unlike the deep-link, the Embed API
 * requires a concrete `origin` (no current-location) and accepts intermediate
 * `waypoints`.
 */
export function googleMapsEmbedDirectionsUrl({
  origin,
  destination,
  waypoints = [],
  mode = "driving",
}: {
  origin: string;
  destination: string;
  waypoints?: string[];
  mode?: TravelMode;
}) {
  const params = new URLSearchParams({
    key: MAPS_EMBED_KEY ?? "",
    origin,
    destination,
    mode,
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `${EMBED_BASE}/directions?${params.toString()}`;
}
