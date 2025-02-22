import { createContext } from "react";

export type GenreFilterType = "all" | "any";

export const MovieFiltersContext = createContext<{
  genres: Set<string>;
  toggleGenre: (genreId: string) => void;
  toggleGenreUrl: (genreId: string) => string;
  genreFilterType: GenreFilterType;
  setGenreFilterType: (type: GenreFilterType) => void;
  setGenreFilterTypeUrl: (type: GenreFilterType) => string;
} | null>(null);
