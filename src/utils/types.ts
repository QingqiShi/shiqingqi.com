export type MediaListItem = {
  id: number;
  title?: string | null;
  posterPath?: string | null;
  rating?: number | null;
  mediaType?: "movie" | "tv" | null;
};
