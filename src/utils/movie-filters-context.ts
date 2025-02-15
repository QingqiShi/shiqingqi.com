import { createContext } from "react";

export const MovieFiltersContext = createContext<{
  genres: Set<string>;
  toggleGenre: (genreId: string) => void;
} | null>(null);
