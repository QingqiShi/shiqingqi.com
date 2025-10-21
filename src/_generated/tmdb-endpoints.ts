/**
 * TMDB endpoint paths - auto-generated
 * Do not edit manually - changes will be overwritten.
 */

export type TMDBEndpointPaths =
  | "/3/configuration"
  | "/3/configuration/countries"
  | "/3/configuration/languages"
  | "/3/discover/movie"
  | "/3/discover/tv"
  | "/3/genre/movie/list"
  | "/3/genre/tv/list"
  | "/3/movie/{movie_id}"
  | "/3/movie/{movie_id}/recommendations"
  | "/3/movie/{movie_id}/videos"
  | "/3/search/movie"
  | "/3/search/person"
  | "/3/search/tv"
  | "/3/tv/{series_id}"
  | "/3/tv/{series_id}/recommendations"
  | "/3/tv/{series_id}/videos";

export const TMDB_ENDPOINTS = [
  "/3/configuration",
  "/3/configuration/countries",
  "/3/configuration/languages",
  "/3/discover/movie",
  "/3/discover/tv",
  "/3/genre/movie/list",
  "/3/genre/tv/list",
  "/3/movie/{movie_id}",
  "/3/movie/{movie_id}/recommendations",
  "/3/movie/{movie_id}/videos",
  "/3/search/movie",
  "/3/search/person",
  "/3/search/tv",
  "/3/tv/{series_id}",
  "/3/tv/{series_id}/recommendations",
  "/3/tv/{series_id}/videos",
] as const;
