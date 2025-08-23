import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiRequestWrapper } from "./api-request-wrapper";
import type {
  fetchMovieList,
  fetchSimilarMovies,
  fetchTvShowList,
  fetchSimilarTvShows,
} from "./tmdb-api";
import type { fetchConfiguration } from "./tmdb-api";

export const tmdbScope = [{ scope: "tmdb" }];

export const movieList = ({
  page,
  ...params
}: Parameters<typeof fetchMovieList>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "discover/movie", ...tmdbScope, ...params }],
    initialPageParam: page,
    queryFn: async ({ pageParam }) =>
      apiRequestWrapper<typeof fetchMovieList>("/api/tmdb/movie-list", {
        ...params,
        page: pageParam,
      }),
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const movies = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      return Array.from(
        new Map(movies.map((movie) => [movie.id, movie])).values()
      );
    },
  });

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: async () =>
    apiRequestWrapper<typeof fetchConfiguration>(
      "/api/tmdb/get-configuration",
      undefined
    ),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});

export const similarMovies = ({
  page,
  ...params
}: Parameters<typeof fetchSimilarMovies>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "movie/similar", ...tmdbScope, ...params }],
    initialPageParam: page,
    queryFn: async ({ pageParam }) =>
      apiRequestWrapper<typeof fetchSimilarMovies>("/api/tmdb/similar-movies", {
        ...params,
        page: pageParam,
      }),
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const movies = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      return Array.from(
        new Map(movies.map((movie) => [movie.id, movie])).values()
      );
    },
  });

export const tvShowList = ({
  page,
  ...params
}: Parameters<typeof fetchTvShowList>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "discover/tv", ...tmdbScope, ...params }],
    initialPageParam: page,
    queryFn: async ({ pageParam }) =>
      apiRequestWrapper<typeof fetchTvShowList>("/api/tmdb/tv-show-list", {
        ...params,
        page: pageParam,
      }),
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const tvShows = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      return Array.from(
        new Map(tvShows.map((tvShow) => [tvShow.id, tvShow])).values()
      );
    },
  });

export const similarTvShows = ({
  page,
  ...params
}: Parameters<typeof fetchSimilarTvShows>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "tv/similar", ...tmdbScope, ...params }],
    initialPageParam: page,
    queryFn: async ({ pageParam }) =>
      apiRequestWrapper<typeof fetchSimilarTvShows>(
        "/api/tmdb/similar-tv-shows",
        {
          ...params,
          page: pageParam,
        }
      ),
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const tvShows = data.pages
        .flatMap((page) => page.results)
        .filter((x) => !!x);
      return Array.from(
        new Map(tvShows.map((tvShow) => [tvShow.id, tvShow])).values()
      );
    },
  });
