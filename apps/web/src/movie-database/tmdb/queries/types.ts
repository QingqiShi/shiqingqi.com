import type * as tmdbClientFunctions from "#src/_generated/tmdb-client-functions.ts";

/**
 * The TMDB functions a query calls. The client functions are the default; a
 * server prefetch passes the server functions, which have the same signatures.
 */
export type TmdbFunctions = typeof tmdbClientFunctions;

/** Addresses one Media for every query that reads a single record. */
export interface MediaDetailsParams {
  type: "movie" | "tv";
  id: string;
  language?: string;
}

/** Addresses one Person for every query that reads a single record. */
export interface PersonDetailsParams {
  id: string;
  language?: string;
}
