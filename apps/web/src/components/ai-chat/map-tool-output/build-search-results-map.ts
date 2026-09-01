import type { MediaListItem } from "#src/utils/media-list-item.ts";
import { mapToolOutputToMediaItems } from "./map-tool-output-to-media-items";

export function buildSearchResultsMap(
  toolName: string,
  output: unknown,
): ReadonlyMap<string, MediaListItem> {
  const items = mapToolOutputToMediaItems(toolName, output);
  const map = new Map<string, MediaListItem>();
  for (const item of items) {
    if (item.mediaType) {
      map.set(`${item.mediaType}:${String(item.id)}`, item);
    }
  }
  return map;
}
