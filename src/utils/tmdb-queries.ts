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
    queryFn: async ({ pageParam }) => {
      await Promise.resolve();
      return fetchMovieList({ ...params, page: pageParam });
    },
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
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: () => fetchConfiguration(),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
