import { presentMediaInputSchema } from "#src/ai-chat/tools/create-present-media-tool.ts";
import type { MediaListItem } from "#src/utils/media-list-item.ts";

export function resolveMediaItems(
  input: unknown,
  searchResults: ReadonlyMap<string, MediaListItem>,
): ReadonlyArray<MediaListItem> {
  const parsed = presentMediaInputSchema.safeParse(input);
  if (!parsed.success) return [];

  const items: MediaListItem[] = [];
  for (const entry of parsed.data.media) {
    const key = `${entry.media_type}:${String(entry.id)}`;
    const found = searchResults.get(key);
    if (found) {
      items.push(found);
    } else {
      items.push({
        id: entry.id,
        mediaType: entry.media_type,
      });
    }
  }
  return items;
}
