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
  setGenreFilterTypeUrl: (type: GenreFilterType) => string;

  sort: Sort;
  setSort: (sort: Sort) => void;
  setSortUrl: (sort: Sort) => string;

  mediaType: MediaType;
  setMediaType: (type: MediaType) => void;
  setMediaTypeUrl: (type: MediaType) => string;

  view: MediaView;
  setView: (view: MediaView) => void;
  setViewUrl: (view: MediaView) => string;

  canReset: boolean;
  reset: () => void;
  resetUrl: () => string;
} | null>(null);
