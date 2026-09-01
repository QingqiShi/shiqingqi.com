import { infiniteQueryOptions } from "@tanstack/react-query";
import type {
  discoverMovies,
  discoverTvShows,
} from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import type { QueryParams } from "../tmdb-get";
import { selectMediaListItems } from "./select-media-list-items";
import { tmdbScope } from "./tmdb-scope";

type MovieListParams = QueryParams<"/3/discover/movie", "get"> & {
  type: "movie";
};
type TvShowListParams = QueryParams<"/3/discover/tv", "get"> & { type: "tv" };

export const mediaListQuery = (params: MovieListParams | TvShowListParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "mediaList", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof discoverTvShows>(
          "/api/tmdb/discover-tv-shows",
          { ...queryParams, page: pageParam },
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof discoverMovies>(
          "/api/tmdb/discover-movies",
          { ...queryParams, page: pageParam },
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
