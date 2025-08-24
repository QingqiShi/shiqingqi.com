import { use } from "react";
import { MediaFiltersContext } from "@/utils/media-filters-context";

export function useMediaFilters() {
  const value = use(MediaFiltersContext);
  if (!value) {
    throw new Error(
      "`useMediaFilters` must be used within a `MediaFiltersProvider`",
    );
  }
  return value;
}
