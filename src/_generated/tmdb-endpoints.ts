/**
 * TMDB endpoint paths - auto-generated
 * Do not edit manually - changes will be overwritten.
 */

export type TMDBEndpointPaths =
  | "/3/configuration"
  | "/3/discover/movie"
  | "/3/discover/tv"
  | "/3/genre/movie/list"
  | "/3/genre/tv/list"
  | "/3/movie/{movie_id}"
  | "/3/movie/{movie_id}/credits"
  | "/3/movie/{movie_id}/recommendations"
  | "/3/movie/{movie_id}/videos"
  | "/3/movie/{movie_id}/watch/providers"
  | "/3/person/{person_id}"
  | "/3/person/{person_id}/combined_credits"
  | "/3/search/multi"
  | "/3/trending/movie/{time_window}"
  | "/3/trending/tv/{time_window}"
  | "/3/tv/{series_id}"
  | "/3/tv/{series_id}/credits"
  | "/3/tv/{series_id}/recommendations"
  | "/3/tv/{series_id}/videos"
  | "/3/tv/{series_id}/watch/providers";

export const TMDB_ENDPOINTS = [
  "/3/configuration",
  "/3/discover/movie",
  "/3/discover/tv",
  "/3/genre/movie/list",
  "/3/genre/tv/list",
  "/3/movie/{movie_id}",
  "/3/movie/{movie_id}/credits",
  "/3/movie/{movie_id}/recommendations",
  "/3/movie/{movie_id}/videos",
  "/3/movie/{movie_id}/watch/providers",
  "/3/person/{person_id}",
  "/3/person/{person_id}/combined_credits",
  "/3/search/multi",
  "/3/trending/movie/{time_window}",
  "/3/trending/tv/{time_window}",
  "/3/tv/{series_id}",
  "/3/tv/{series_id}/credits",
  "/3/tv/{series_id}/recommendations",
  "/3/tv/{series_id}/videos",
  "/3/tv/{series_id}/watch/providers",
] as const;
