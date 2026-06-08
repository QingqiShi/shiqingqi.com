/** Build a Google Maps search URL that opens to the given place/query. */
export function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type TravelMode = "driving" | "transit" | "walking";

/**
 * Build a Google Maps *directions* deep-link that opens with the route
 * preloaded. `origin` omitted = Maps uses the device's current location.
 */
export function googleMapsDirectionsUrl({
  origin,
  destination,
  waypoints,
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
  if (waypoints && waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
