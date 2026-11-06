import type { ResponseType } from "#src/movie-database/tmdb/tmdb-get.ts";

export const MAX_MEDIA_RESULTS = 10;

type MovieResult = NonNullable<
  ResponseType<"/3/discover/movie", "get">["results"]
>[number];
type TvResult = NonNullable<
  ResponseType<"/3/discover/tv", "get">["results"]
>[number];
type MediaResult = Pick<MovieResult, "id"> & Partial<MovieResult & TvResult>;

/**
 * Maps a TMDB search, discover, or recommendation result to the per-title
 * shape that every TMDB chat tool returns, so `present_media` can resolve
 * the same fields.
 */
export function toCompactMediaResult<TMediaType extends string | undefined>(
  result: MediaResult,
  mediaType: TMediaType,
) {
  return {
    id: result.id,
    media_type: mediaType,
    title: result.title,
    release_date: result.release_date,
    name: result.name,
    first_air_date: result.first_air_date,
    overview: result.overview,
    vote_average: result.vote_average,
    poster_path: result.poster_path,
    genre_ids: result.genre_ids,
    original_language: result.original_language,
  };
}

export function toCompactMediaResults(
  results: ReadonlyArray<MediaResult>,
  mediaType: "movie" | "tv",
) {
  return results
    .slice(0, MAX_MEDIA_RESULTS)
    .map((result) => toCompactMediaResult(result, mediaType));
}
