import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiRequestWrapper } from "./api-request-wrapper";
import type { fetchMovieList, fetchSimilarMovies } from "./tmdb-api";
import type { fetchConfiguration } from "./tmdb-api";

export const tmdbScope = [{ scope: "tmdb" }];

export const movieList = ({
  page,
  ...params
}: Parameters<typeof fetchMovieList>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "discover/movie", ...tmdbScope[0], ...params }],
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
      const uniqueMovies = Array.from(
        new Map(movies.map((movie) => [movie.id, movie])).values()
      );
      return {
        movies: uniqueMovies,
        totalCount: data.pages[0].total_results,
      };
    },
  });

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope[0] }],
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
    queryKey: [{ query: "movie/similar", ...tmdbScope[0], ...params }],
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
      const uniqueMovies = Array.from(
        new Map(movies.map((movie) => [movie.id, movie])).values()
      );
      return {
        movies: uniqueMovies,
        totalCount: data.pages[0].total_results,
      };
    },
  });
