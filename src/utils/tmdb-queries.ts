import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchConfiguration, fetchMovieList } from "./tmdb-api";

export const tmdbScope = [{ scope: "tmdb" }];

export const movieList = ({
  page,
  ...params
}: Parameters<typeof fetchMovieList>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "discover/movie", ...tmdbScope, ...params }],
    initialPageParam: page,
    queryFn: ({ pageParam }) => fetchMovieList({ ...params, page: pageParam }),
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    maxPages: 5, // Maximally hold 100 items in the cache
  });

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: () => fetchConfiguration(),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
