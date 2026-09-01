import { queryOptions } from "@tanstack/react-query";
import type {
  getMovieVideos,
  getTvShowVideos,
} from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";
import type { MediaDetailsParams } from "./types";

export const mediaVideosQuery = (params: MediaDetailsParams) =>
  queryOptions({
    queryKey: [{ query: "mediaVideos", ...tmdbScope, ...params }],
    queryFn: async () => {
      if (params.type === "tv") {
        const { type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getTvShowVideos>(
          "/api/tmdb/get-tv-show-videos",
          { ...queryParams, series_id: id },
        );
      } else {
        const { type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieVideos>(
          "/api/tmdb/get-movie-videos",
          { ...queryParams, movie_id: id },
        );
      }
    },
  });
