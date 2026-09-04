import { createContext } from "react";
import type { GenreFilterType } from "./genre-filter-type";
import type { MediaType } from "./media-type";
import type { MediaView } from "./media-view";
import type { Sort } from "./sort";

export const MediaFiltersContext = createContext<{
  genres: Set<string>;
  toggleGenre: (genreId: string) => void;
  toggleGenreUrl: (genreId: string) => string;

  genreFilterType: GenreFilterType;
  setGenreFilterType: (type: GenreFilterType) => void;

  sort: Sort;
  setSort: (sort: Sort) => void;

  mediaType: MediaType;
  setMediaType: (type: MediaType) => void;

  view: MediaView;
  setView: (view: MediaView) => void;

  canReset: boolean;
  reset: () => void;
  resetUrl: () => string;
} | null>(null);
