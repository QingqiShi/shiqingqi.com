import { isGenreFilterType, type GenreFilterType } from "./genre-filter-type";
import type { MediaType } from "./media-type";
import { isMediaView, type MediaView } from "./media-view";
import { isSort, type Sort } from "./sort";

export interface MediaFiltersSearchParams {
  genres: string[];
  genreFilterType?: GenreFilterType;
  sort?: Sort;
  mediaType: MediaType;
  view?: MediaView;
}

export function readMediaFiltersSearchParams(
  params: URLSearchParams,
): MediaFiltersSearchParams {
  const genreFilterType = params.get("genreFilterType");
  const sort = params.get("sort");
  const view = params.get("view");

  return {
    genres: params.getAll("genre"),
    genreFilterType: isGenreFilterType(genreFilterType)
      ? genreFilterType
      : undefined,
    sort: isSort(sort) ? sort : undefined,
    mediaType: params.get("type") === "tv" ? "tv" : "movie",
    view: isMediaView(view) ? view : undefined,
  };
}
