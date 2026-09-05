import { createContext } from "react";
import type {
  MatchMode,
  MediaFilters,
  MediaType,
  MediaView,
  Sort,
} from "./types";

export const MediaFiltersContext = createContext<
  | (MediaFilters & {
      toggleGenre: (genreId: string) => void;
      toggleGenreUrl: (genreId: string) => string;

      setMatchMode: (mode: MatchMode) => void;

      setSort: (sort: Sort) => void;

      setMediaType: (type: MediaType) => void;

      setView: (view: MediaView) => void;

      canReset: boolean;
      reset: () => void;
      resetUrl: () => string;
    })
  | null
>(null);
