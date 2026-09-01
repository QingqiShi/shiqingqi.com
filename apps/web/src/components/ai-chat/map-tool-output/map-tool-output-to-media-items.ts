import { isRecord } from "#src/utils/is-record.ts";
import type { MediaListItem } from "#src/utils/media-list-item.ts";

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

function mapPersonCreditsOutput(output: unknown): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];
  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;

    items.push({
      id: entry.id,
      title: typeof entry.title === "string" ? entry.title : undefined,
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

export function mapToolOutputToMediaItems(
  toolName: string,
  output: unknown,
): ReadonlyArray<MediaListItem> {
  switch (toolName) {
    case "tmdb_search":
      return mapTmdbSearchOutput(output);
    case "semantic_search":
      return mapSemanticSearchOutput(output);
    case "person_credits":
      return mapPersonCreditsOutput(output);
    default:
      return [];
  }
}
