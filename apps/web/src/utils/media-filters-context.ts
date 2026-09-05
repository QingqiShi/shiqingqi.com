import { createContext } from "react";
import type { MatchMode, MediaFilters, MediaView, Sort } from "./media-filters";
import type { MediaType } from "./media-type";

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
