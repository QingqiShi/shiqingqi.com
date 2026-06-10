import type { NavLeg, TravelMode } from "@/data/types";

/** Build a Google Maps search URL that opens to the given place/query. */
export function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Build a Google Maps *directions* deep-link that opens with the route
 * preloaded. `origin` omitted = Maps uses the device's current location.
 * Single hop only — one origin, one destination — so the link drops the user
 * straight onto the next leg without earlier stops to clear.
 */
export function googleMapsDirectionsUrl({
  origin,
  destination,
  mode = "driving",
}: {
  origin?: string;
  destination: string;
  mode?: TravelMode;
}) {
  const params = new URLSearchParams({ api: "1", travelmode: mode });
  if (origin) params.set("origin", origin);
  params.set("destination", destination);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* -------------------------------------------------------------------------- */
/* Embedded maps (Google Maps Embed API)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Public Embed-API key. It ships inside the iframe `src`, so it is *meant* to
 * be public — restrict it by HTTP referrer and to the Maps Embed API in Google
 * Cloud. When unset, embeds are disabled and the app falls back to deep-links.
 */
const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

/** Whether inline map previews can render (a key is configured). */
export const mapsEmbedEnabled = Boolean(mapsEmbedKey);

const EMBED_BASE = "https://www.google.com/maps/embed/v1";

/** Embed-API URL that previews a single place. */
export function googleMapsEmbedPlaceUrl(query: string) {
  const params = new URLSearchParams({ key: mapsEmbedKey ?? "", q: query });
  return `${EMBED_BASE}/place?${params.toString()}`;
}

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
    key: mapsEmbedKey ?? "",
    origin,
    destination,
    mode,
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `${EMBED_BASE}/directions?${params.toString()}`;
}

/** The Embed API caps how many waypoints one route may carry; stay well under. */
export const MAX_ROUTE_WAYPOINTS = 10;

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
    if (leg.to !== points.at(-1)) points.push(leg.to);
  }
  return points;
}

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
