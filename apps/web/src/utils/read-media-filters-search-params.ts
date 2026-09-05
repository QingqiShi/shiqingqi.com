import type { MatchMode, MediaView, Sort } from "./media-filters";
import type { MediaType } from "./media-type";

const SORTS: readonly Sort[] = [
  "popularity.asc",
  "popularity.desc",
  "vote_average.asc",
  "vote_average.desc",
];

const MATCH_MODES: readonly MatchMode[] = ["all", "any"];

const MEDIA_VIEWS: readonly MediaView[] = ["grid", "table"];

function validValue<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined {
  return allowed.find((option) => option === value);
}

export interface MediaFiltersSearchParams {
  genres: string[];
  matchMode?: MatchMode;
  sort?: Sort;
  mediaType: MediaType;
  view?: MediaView;
}

export function readMediaFiltersSearchParams(
  params: URLSearchParams,
): MediaFiltersSearchParams {
  return {
    genres: params.getAll("genre"),
    matchMode: validValue(params.get("genreFilterType"), MATCH_MODES),
    sort: validValue(params.get("sort"), SORTS),
    mediaType: params.get("type") === "tv" ? "tv" : "movie",
    view: validValue(params.get("view"), MEDIA_VIEWS),
  };
}
