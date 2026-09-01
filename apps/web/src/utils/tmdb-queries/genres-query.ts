import { queryOptions } from "@tanstack/react-query";
import type {
  getMovieGenres,
  getTvShowGenres,
} from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";

type GenresParams = {
  type: "movie" | "tv";
  language?: string;
};

export const genresQuery = (params: GenresParams) =>
  queryOptions({
    queryKey: [{ query: "genres", ...tmdbScope, ...params }],
    queryFn: async () => {
      if (params.type === "tv") {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof getTvShowGenres>(
          "/api/tmdb/get-tv-genres",
          queryParams,
        );
      } else {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieGenres>(
          "/api/tmdb/get-movie-genres",
          queryParams,
        );
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
