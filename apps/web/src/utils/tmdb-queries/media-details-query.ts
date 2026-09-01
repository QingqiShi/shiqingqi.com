import { queryOptions } from "@tanstack/react-query";
import type {
  getMovieDetails,
  getTvShowDetails,
} from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";
import type { MediaDetailsParams } from "./types";

/** One Media's details, with Movie and TV show reconciled into one shape. */
export interface NormalizedMediaDetails {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | undefined;
  runtime: number;
  numberOfSeasons: number;
  genres: string[];
  overview: string | null;
  tagline: string | null;
  voteAverage: number;
  voteCount: number;
}

export const mediaDetailsQuery = (params: MediaDetailsParams) =>
  queryOptions({
    queryKey: [{ query: "mediaDetail", ...tmdbScope, ...params }],
    queryFn: async (): Promise<NormalizedMediaDetails> => {
      if (params.type === "tv") {
        const { type, id, ...queryParams } = params;
        const data = await apiRequestWrapper<typeof getTvShowDetails>(
          "/api/tmdb/get-tv-show-details",
          { ...queryParams, series_id: id },
        );
        return {
          title: data.name ?? data.original_name ?? "",
          posterPath: data.poster_path ?? null,
          backdropPath: data.backdrop_path ?? null,
          releaseDate: data.first_air_date,
          runtime: 0,
          numberOfSeasons: data.number_of_seasons,
          genres:
            data.genres
              ?.map((g) => g.name)
              .filter((n): n is string => n !== undefined) ?? [],
          overview: data.overview ?? null,
          tagline: data.tagline ?? null,
          voteAverage: data.vote_average,
          voteCount: data.vote_count,
        };
      }
      const { type, id, ...queryParams } = params;
      const data = await apiRequestWrapper<typeof getMovieDetails>(
        "/api/tmdb/get-movie-details",
        { ...queryParams, movie_id: id },
      );
      return {
        title: data.title ?? data.original_title ?? "",
        posterPath: data.poster_path ?? null,
        backdropPath: data.backdrop_path ?? null,
        releaseDate: data.release_date,
        runtime: data.runtime,
        numberOfSeasons: 0,
        genres:
          data.genres
            ?.map((g) => g.name)
            .filter((n): n is string => n !== undefined) ?? [],
        overview: data.overview ?? null,
        tagline: data.tagline ?? null,
        voteAverage: data.vote_average,
        voteCount: data.vote_count,
      };
    },
  });
