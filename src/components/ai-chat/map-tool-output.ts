import { presentMediaInputSchema } from "#src/ai-chat/tools/present-media.ts";
import type { MediaListItem } from "#src/utils/types.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapTmdbSearchOutput(output: unknown): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];

  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;
    // Person results have no detail pages
    if (entry.media_type === "person") continue;

    items.push({
      id: entry.id,
      title:
        typeof entry.title === "string"
          ? entry.title
          : typeof entry.name === "string"
            ? entry.name
            : undefined,
      posterPath:
        typeof entry.poster_path === "string" ? entry.poster_path : null,
      rating:
        typeof entry.vote_average === "number" ? entry.vote_average : null,
      mediaType:
        entry.media_type === "movie" || entry.media_type === "tv"
          ? entry.media_type
          : null,
    });
  }

  return items;
}

function mapSemanticSearchOutput(
  output: unknown,
): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];

  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.tmdbId !== "number") continue;

    items.push({
      id: entry.tmdbId,
      title: typeof entry.title === "string" ? entry.title : undefined,
      posterPath:
        typeof entry.posterPath === "string" ? entry.posterPath : null,
      rating: typeof entry.voteAverage === "number" ? entry.voteAverage : null,
      mediaType:
        entry.mediaType === "movie" || entry.mediaType === "tv"
          ? entry.mediaType
          : null,
    });
  }

  return items;
}

export function mapToolOutputToMediaItems(
  toolName: string,
  output: unknown,
): ReadonlyArray<MediaListItem> {
  switch (toolName) {
    case "tmdb_search":
      return mapTmdbSearchOutput(output);
    case "semantic_search":
      return mapSemanticSearchOutput(output);
    default:
      return [];
  }
}

export function buildSearchResultsMap(
  toolName: string,
  output: unknown,
): ReadonlyMap<string, MediaListItem> {
  const items = mapToolOutputToMediaItems(toolName, output);
  const map = new Map<string, MediaListItem>();
  for (const item of items) {
    if (item.mediaType) {
      map.set(`${item.mediaType}:${item.id}`, item);
    }
  }
  return map;
}

export function resolveMediaItems(
  input: unknown,
  searchResults: ReadonlyMap<string, MediaListItem>,
): ReadonlyArray<MediaListItem> {
  const parsed = presentMediaInputSchema.safeParse(input);
  if (!parsed.success) return [];

  const items: MediaListItem[] = [];
  for (const entry of parsed.data.media) {
    const key = `${entry.media_type}:${entry.id}`;
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
