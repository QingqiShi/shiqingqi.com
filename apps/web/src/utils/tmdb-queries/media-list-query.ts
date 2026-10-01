import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  discoverMovies,
  discoverTvShows,
} from "#src/_generated/tmdb-client-functions.ts";
import type { MatchMode, MediaType, Sort } from "../types";
import { selectMediaListItems } from "./select-media-list-items";
import { tmdbScope } from "./tmdb-scope";
import type { TmdbFunctions } from "./types";

/** The Browse filters that select one Discover result set. */
interface MediaListParams {
  type: MediaType;
  page: number;
  language: string;
  genres: Iterable<string>;
  matchMode?: MatchMode;
  sort?: Sort;
}

function toDiscoverParams({
  genres,
  matchMode,
  sort,
  ...params
}: MediaListParams) {
  return {
    ...params,
    with_genres: [...genres].join(matchMode === "any" ? "|" : ",") || undefined,
    sort_by: sort !== "popularity.desc" ? sort : undefined,
  };
}

export const mediaListQuery = (
  params: MediaListParams,
  tmdb: Pick<TmdbFunctions, "discoverMovies" | "discoverTvShows"> = {
    discoverMovies,
    discoverTvShows,
  },
) => {
  const discoverParams = toDiscoverParams(params);
  return infiniteQueryOptions({
    queryKey: [{ query: "mediaList", ...tmdbScope, ...discoverParams }],
    initialPageParam: discoverParams.page,
    queryFn: async ({ pageParam }) => {
      const { type, ...queryParams } = discoverParams;
      return type === "tv"
        ? tmdb.discoverTvShows({ ...queryParams, page: pageParam })
        : tmdb.discoverMovies({ ...queryParams, page: pageParam });
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => selectMediaListItems(data, params.type),
  });
};
