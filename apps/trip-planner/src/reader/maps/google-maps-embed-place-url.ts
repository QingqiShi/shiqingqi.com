import { EMBED_BASE, MAPS_EMBED_KEY } from "./constants";

/** Embed-API URL that previews a single place. */
export function googleMapsEmbedPlaceUrl(query: string) {
  const params = new URLSearchParams({ key: MAPS_EMBED_KEY ?? "", q: query });
  return `${EMBED_BASE}/place?${params.toString()}`;
}
