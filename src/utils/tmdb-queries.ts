import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiRequestWrapper } from "./api-request-wrapper";
import type {
  fetchMovieList,
  fetchSimilarMovies,
  fetchTvShowList,
  fetchSimilarTvShows,
  fetchMovieGenres,
  fetchTvShowGenres,
} from "./tmdb-api";
import type { fetchConfiguration } from "./tmdb-api";

export const tmdbScope = [{ scope: "tmdb" }];

type MovieListParams = Parameters<typeof fetchMovieList>[0] & { type: "movie" };
type TvShowListParams = Parameters<typeof fetchTvShowList>[0] & { type: "tv" };

export const mediaList = (params: MovieListParams | TvShowListParams) => {
  return infiniteQueryOptions({
    queryKey: [{ ...tmdbScope, ...params, query: "discover/tv" }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchTvShowList>(
          "/api/tmdb/tv-show-list",
          { ...queryParams, page: pageParam },
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchMovieList>(
          "/api/tmdb/movie-list",
          { ...queryParams, page: pageParam },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const mediaList = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values(),
      );
    },
  });
};

type SimilarMediaParams = {
  type: "movie" | "tv";
  id: string;
  page: number;
  language?: string;
};

export const similarMedia = (params: SimilarMediaParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: `${params.type}/similar`, ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchSimilarTvShows>(
          "/api/tmdb/similar-tv-shows",
          { ...queryParams, seriesId: id, page: pageParam },
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchSimilarMovies>(
          "/api/tmdb/similar-movies",
          { ...queryParams, movieId: id, page: pageParam },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const mediaList = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values(),
      );
    },
  });
};

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: async () =>
    apiRequestWrapper<typeof fetchConfiguration>(
      "/api/tmdb/get-configuration",
      undefined,
    ),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});

export const movieGenres = (params: Parameters<typeof fetchMovieGenres>[0]) =>
  queryOptions({
    queryKey: [{ query: "movie/genres", ...tmdbScope, ...params }],
    queryFn: async () =>
      apiRequestWrapper<typeof fetchMovieGenres>(
        "/api/tmdb/movie-genres",
        params,
      ),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

export const tvGenres = (params: Parameters<typeof fetchTvShowGenres>[0]) =>
  queryOptions({
    queryKey: [{ query: "tv/genres", ...tmdbScope, ...params }],
    queryFn: async () =>
      apiRequestWrapper<typeof fetchTvShowGenres>(
        "/api/tmdb/tv-genres",
        params,
      ),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
