import { queryOptions } from "@tanstack/react-query";
import {
  getMovieGenres,
  getTvShowGenres,
} from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { TmdbFunctions } from "./types";

type GenresParams = {
  type: "movie" | "tv";
  language?: string;
};

export const genresQuery = (
  params: GenresParams,
  tmdb: Pick<TmdbFunctions, "getMovieGenres" | "getTvShowGenres"> = {
    getMovieGenres,
    getTvShowGenres,
  },
) =>
  queryOptions({
    queryKey: [{ query: "genres", ...tmdbScope, ...params }],
    queryFn: async () => {
      const { type, ...queryParams } = params;
      return type === "tv"
        ? tmdb.getTvShowGenres(queryParams)
        : tmdb.getMovieGenres(queryParams);
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
