export type Sort =
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc";

export type MatchMode = "all" | "any";

/** How the discover results are laid out: poster grid or data table. */
export type MediaView = "grid" | "table";

export interface MediaFilters {
  genres: Set<string>;
  matchMode: MatchMode;
  sort: Sort;
  mediaType: MediaType;
  // Layout choice rather than a query input — it never feeds the TMDB request
  // and `reset` deliberately leaves it alone. It lives here because this
  // provider owns the page's whole search string: `buildFiltersSearchParams`
  // rebuilds the query from scratch on every commit, so any param managed
  // elsewhere would be dropped the next time a filter changed.
  view: MediaView;
}

export type MediaListItem = {
  id: number;
  title?: string | null;
  posterPath?: string | null;
  rating?: number | null;
  mediaType?: "movie" | "tv" | null;
  // Columnar extras. Only the discover endpoints populate these — the AI chat
  // tools build `MediaListItem`s from leaner payloads — so every consumer must
  // treat them as optional. The table view is the only surface that reads them.
  originalTitle?: string | null;
  releaseDate?: string | null;
  voteCount?: number | null;
  popularity?: number | null;
  genreIds?: number[] | null;
  originalLanguage?: string | null;
  overview?: string | null;
};

export type MediaType = "movie" | "tv";

export type PersonListItem = {
  id: number;
  name?: string | null;
  profilePath?: string | null;
  knownForDepartment?: string | null;
};
