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
