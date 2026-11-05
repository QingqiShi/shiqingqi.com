import { isRecord } from "#src/movie-database/is-record.ts";
import type { MediaListItem } from "#src/movie-database/types.ts";

function mapMediaResultsOutput(output: unknown): ReadonlyArray<MediaListItem> {
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
    case "tmdb_discover":
    case "tmdb_recommendations":
      return mapMediaResultsOutput(output);
    case "person_credits":
      return mapPersonCreditsOutput(output);
    default:
      return [];
  }
}
