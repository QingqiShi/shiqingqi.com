import { infiniteQueryOptions } from "@tanstack/react-query";
import {
  getMovieRecommendations,
  getTvShowRecommendations,
} from "#src/_generated/tmdb-client-functions.ts";
import { selectMediaListItems } from "./select-media-list-items";
import { tmdbScope } from "./tmdb-scope";
import type { TmdbFunctions } from "./types";

type SimilarMediaParams = {
  type: "movie" | "tv";
  id: string;
  page: number;
  language?: string;
};

export const similarMediaQuery = (
  params: SimilarMediaParams,
  tmdb: Pick<
    TmdbFunctions,
    "getMovieRecommendations" | "getTvShowRecommendations"
  > = { getMovieRecommendations, getTvShowRecommendations },
) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "similarMedia", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      const { page, type, id, ...queryParams } = params;
      return type === "tv"
        ? tmdb.getTvShowRecommendations({
            ...queryParams,
            series_id: id,
            page: pageParam,
          })
        : tmdb.getMovieRecommendations({
            ...queryParams,
            movie_id: id,
            page: pageParam,
          });
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => selectMediaListItems(data, params.type),
  });
};
