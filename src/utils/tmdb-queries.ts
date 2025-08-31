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
    queryKey: [{ query: "mediaList", ...tmdbScope, ...params }],
    initialPageParam: params.page ?? 1,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchTvShowList>(
          "/api/tmdb/tv-show-list",
          {
            ...queryParams,
            page: pageParam,
            language: queryParams.language ?? "en",
          },
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchMovieList>(
          "/api/tmdb/movie-list",
          {
            ...queryParams,
            page: pageParam,
            language: queryParams.language ?? "en",
          },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      (firstPage.page ?? 1) > 1 ? (firstPage.page ?? 1) - 1 : undefined,
    getNextPageParam: (lastPage) =>
      (lastPage.total_pages ?? 0) > (lastPage.page ?? 0)
        ? (lastPage.page ?? 0) + 1
        : undefined,
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
    queryKey: [{ query: "similarMedia", ...tmdbScope, ...params }],
    initialPageParam: params.page ?? 1,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchSimilarTvShows>(
          "/api/tmdb/similar-tv-shows",
          {
            ...queryParams,
            seriesId: id,
            page: pageParam,
            language: queryParams.language ?? "en",
          },
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchSimilarMovies>(
          "/api/tmdb/similar-movies",
          {
            ...queryParams,
            movieId: id,
            page: pageParam,
            language: queryParams.language ?? "en",
          },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      (firstPage.page ?? 1) > 1 ? (firstPage.page ?? 1) - 1 : undefined,
    getNextPageParam: (lastPage) =>
      (lastPage.total_pages ?? 0) > (lastPage.page ?? 0)
        ? (lastPage.page ?? 0) + 1
        : undefined,
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

type GenresParams = {
  type: "movie" | "tv";
  language?: string;
};

export const genres = (params: GenresParams) =>
  queryOptions({
    queryKey: [{ query: "genres", ...tmdbScope, ...params }],
    queryFn: async () => {
      if (params.type === "tv") {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchTvShowGenres>(
          "/api/tmdb/tv-genres",
          { ...queryParams, language: queryParams.language ?? "en" },
        );
      } else {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchMovieGenres>(
          "/api/tmdb/movie-genres",
          { ...queryParams, language: queryParams.language ?? "en" },
        );
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
