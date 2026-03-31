export type MediaListItem = {
  id: number;
  title?: string | null;
  posterPath?: string | null;
  rating?: number | null;
  mediaType?: "movie" | "tv" | null;
};

export type PersonListItem = {
  id: number;
  name?: string | null;
  profilePath?: string | null;
  knownForDepartment?: string | null;
};
