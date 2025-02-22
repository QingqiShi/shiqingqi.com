import { createContext } from "react";

export type GenreFilterType = "all" | "any";
export type Sort =
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc";

export const MovieFiltersContext = createContext<{
  genres: Set<string>;
  toggleGenre: (genreId: string) => void;
  toggleGenreUrl: (genreId: string) => string;

  genreFilterType: GenreFilterType;
  setGenreFilterType: (type: GenreFilterType) => void;
  setGenreFilterTypeUrl: (type: GenreFilterType) => string;

  sort: Sort;
  setSort: (sort: Sort) => void;
  setSortUrl: (sort: Sort) => string;

  reset: () => void;
  resetUrl: () => string;
} | null>(null);
