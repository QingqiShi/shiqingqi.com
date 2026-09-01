/**
 * Public Embed-API key. It ships inside the iframe `src`, so it is *meant* to
 * be public — restrict it by HTTP referrer and to the Maps Embed API in Google
 * Cloud. When unset, embeds are disabled and the app falls back to deep-links.
 */
export const MAPS_EMBED_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

/** Whether inline map previews can render (a key is configured). */
export const mapsEmbedEnabled = Boolean(MAPS_EMBED_KEY);

export const EMBED_BASE = "https://www.google.com/maps/embed/v1";

/** The Embed API caps how many waypoints one route may carry; stay well under. */
export const MAX_ROUTE_WAYPOINTS = 10;
