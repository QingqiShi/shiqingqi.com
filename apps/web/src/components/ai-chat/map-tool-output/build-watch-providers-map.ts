import type { WatchProviderOutput } from "../tool-watch-providers";
import { parseWatchProviderOutput } from "../tool-watch-providers";

function watchProvidersKey(data: WatchProviderOutput): string {
  if (data.type === "region") {
    return `wp:region:${String(data.id)}:${data.mediaType}:${data.region}`;
  }
  return `wp:provider:${String(data.id)}:${data.mediaType}:${data.providerName.toLowerCase()}`;
}

export function buildWatchProvidersMap(
  output: unknown,
): ReadonlyMap<string, WatchProviderOutput> {
  const map = new Map<string, WatchProviderOutput>();
  const parsed = parseWatchProviderOutput(output);
  if (parsed) {
    map.set(watchProvidersKey(parsed), parsed);
  }
  return map;
}
