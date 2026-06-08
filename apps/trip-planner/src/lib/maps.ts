/** Build a Google Maps search URL that opens to the given place/query. */
export function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type TravelMode = "driving" | "transit" | "walking";

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
