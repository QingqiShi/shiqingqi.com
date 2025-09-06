import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiRequestWrapper } from "./api-request-wrapper";
import type { QueryParams, ResponseType } from "./tmdb-client";
import type { getMovieGenres, getTvShowGenres } from "./tmdb-server-functions";
import {
  type discoverMovies,
  type discoverTvShows,
  type getConfiguration,
  type getMovieRecommendations,
  type getTvShowRecommendations,
} from "./tmdb-server-functions";
import type { MediaListItem } from "./types";

type MovieResult = NonNullable<
  ResponseType<"/3/discover/movie", "get">["results"]
>[number];
type TvResult = NonNullable<
  ResponseType<"/3/discover/tv", "get">["results"]
>[number];
type MediaResult = MovieResult | TvResult;

export const tmdbScope = [{ scope: "tmdb" }];

type MovieListParams = QueryParams<"/3/discover/movie", "get"> & {
  type: "movie";
};
type TvShowListParams = QueryParams<"/3/discover/tv", "get"> & { type: "tv" };

function isMovieListResult(result: MediaResult): result is MovieResult {
  return "name" in result;
}

export const mediaList = (params: MovieListParams | TvShowListParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "mediaList", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof discoverTvShows>(
          "/api/tmdb/discover-tv-shows",
          { ...queryParams, page: pageParam }
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof discoverMovies>(
          "/api/tmdb/discover-movies",
          { ...queryParams, page: pageParam }
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const mediaList = data.pages
        .flatMap<MediaResult>((page) => page.results ?? [])
        .map<MediaListItem>((media) =>
          isMovieListResult(media)
            ? {
                id: media.id,
                title: media.title,
                posterPath: media.poster_path,
                rating: media.vote_average,
              }
            : {
                id: media.id,
                title: media.name,
                posterPath: media.poster_path,
                rating: media.vote_average,
              }
        );
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values()
      );
    },
  });
};

type SimilarMediaParams = {
  type: "movie" | "tv";
  id: string;
  page: number;
  language?: string;
};

export const similarMedia = (params: SimilarMediaParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "similarMedia", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getTvShowRecommendations>(
          "/api/tmdb/get-tv-show-recommendations",
          {
            ...queryParams,
            series_id: id,
            page: pageParam,
          }
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieRecommendations>(
          "/api/tmdb/get-movie-recommendations",
          {
            ...queryParams,
            movie_id: id,
            page: pageParam,
          }
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data) => {
      const mediaList = data.pages
        .flatMap<MediaResult>((page) => page.results ?? [])
        .map<MediaListItem>((media) =>
          isMovieListResult(media)
            ? {
                id: media.id,
                title: media.title,
                posterPath: media.poster_path,
                rating: media.vote_average,
              }
            : {
                id: media.id,
                title: media.name,
                posterPath: media.poster_path,
                rating: media.vote_average,
              }
        );
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values()
      );
    },
  });
};

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: async () =>
    apiRequestWrapper<typeof getConfiguration>(
      "/api/tmdb/get-configuration",
      undefined
    ),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});

type GenresParams = {
  type: "movie" | "tv";
  language?: string;
};

export const genres = (params: GenresParams) =>
  queryOptions({
    queryKey: [{ query: "genres", ...tmdbScope, ...params }],
    queryFn: async () => {
      if (params.type === "tv") {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof getTvShowGenres>(
          "/api/tmdb/get-tv-genres",
          queryParams
        );
      } else {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieGenres>(
          "/api/tmdb/get-movie-genres",
          queryParams
        );
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
