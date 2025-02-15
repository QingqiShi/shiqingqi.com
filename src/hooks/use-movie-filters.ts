import { use } from "react";
import { MovieFiltersContext } from "@/utils/movie-filters-context";

export function useMovieFilters() {
  const value = use(MovieFiltersContext);
  if (!value) {
    throw new Error(
      "`useMovieFiltersContext` must be used within a `MovieFiltersProvider`"
    );
  }
  return value;
}
