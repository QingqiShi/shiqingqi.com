import { queryOptions } from "@tanstack/react-query";
import {
  getMovieDetails,
  getTvShowDetails,
} from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { MediaDetailsParams, TmdbFunctions } from "./types";

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

export const mediaDetailsQuery = (
  params: MediaDetailsParams,
  tmdb: Pick<TmdbFunctions, "getMovieDetails" | "getTvShowDetails"> = {
    getMovieDetails,
    getTvShowDetails,
  },
) =>
  queryOptions({
    queryKey: [{ query: "mediaDetail", ...tmdbScope, ...params }],
    queryFn: async (): Promise<NormalizedMediaDetails> => {
      if (params.type === "tv") {
        const { type, id, ...queryParams } = params;
        const data = await tmdb.getTvShowDetails({
          ...queryParams,
          series_id: id,
        });
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
      const data = await tmdb.getMovieDetails({
        ...queryParams,
        movie_id: id,
      });
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
