import { queryOptions } from "@tanstack/react-query";
import {
  getMovieVideos,
  getTvShowVideos,
} from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { MediaDetailsParams, TmdbFunctions } from "./types";

export const mediaVideosQuery = (
  params: MediaDetailsParams,
  tmdb: Pick<TmdbFunctions, "getMovieVideos" | "getTvShowVideos"> = {
    getMovieVideos,
    getTvShowVideos,
  },
) =>
  queryOptions({
    queryKey: [{ query: "mediaVideos", ...tmdbScope, ...params }],
    queryFn: async () => {
      if (params.type === "tv") {
        const { type, id, ...queryParams } = params;
        return tmdb.getTvShowVideos({ ...queryParams, series_id: id });
      } else {
        const { type, id, ...queryParams } = params;
        return tmdb.getMovieVideos({ ...queryParams, movie_id: id });
      }
    },
  });
