import { infiniteQueryOptions } from "@tanstack/react-query";
import type {
  getMovieRecommendations,
  getTvShowRecommendations,
} from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { selectMediaListItems } from "./select-media-list-items";
import { tmdbScope } from "./tmdb-scope";

type SimilarMediaParams = {
  type: "movie" | "tv";
  id: string;
  page: number;
  language?: string;
};

export const similarMediaQuery = (params: SimilarMediaParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "similarMedia", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getTvShowRecommendations>(
          "/api/tmdb/get-tv-show-recommendations",
          {
            ...queryParams,
            series_id: id,
            page: pageParam,
          },
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieRecommendations>(
          "/api/tmdb/get-movie-recommendations",
          {
            ...queryParams,
            movie_id: id,
            page: pageParam,
          },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => selectMediaListItems(data, params.type),
  });
};
