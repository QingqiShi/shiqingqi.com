import { infiniteQueryOptions } from "@tanstack/react-query";
import { fetchMovieList } from "./tmdb-api";

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
