import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchConfiguration, fetchMovieList } from "./tmdb-api";

const scope = [{ scope: "tmdb" }];

export const movieList = ({
  page,
  ...params
}: Parameters<typeof fetchMovieList>[0]) =>
  infiniteQueryOptions({
    queryKey: [{ query: "discover/movie", ...scope, ...params }],
    queryFn: ({ pageParam }) => fetchMovieList({ ...params, page: pageParam }),
    initialPageParam: page,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
  });

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...scope }],
  queryFn: () => fetchConfiguration(),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
