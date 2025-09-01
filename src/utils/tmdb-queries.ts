import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { paths } from "@/_generated/tmdbV3";
import { apiRequestWrapper } from "./api-request-wrapper";
import type {
  fetchMovieList,
  fetchSimilarMovies,
  fetchTvShowList,
  fetchSimilarTvShows,
  fetchMovieGenres,
  fetchTvShowGenres,
} from "./tmdb-api";
import type { fetchConfiguration } from "./tmdb-api";
import type { MediaListItem } from "./types";

type MovieResult = NonNullable<
  paths["/3/discover/movie"]["get"]["responses"]["200"]["content"]["application/json"]["results"]
>[0];
type TvResult = NonNullable<
  paths["/3/discover/tv"]["get"]["responses"]["200"]["content"]["application/json"]["results"]
>[0];
type MediaResult = MovieResult | TvResult;

export const tmdbScope = [{ scope: "tmdb" }];

type MovieListParams = Parameters<typeof fetchMovieList>[0] & { type: "movie" };
type TvShowListParams = Parameters<typeof fetchTvShowList>[0] & { type: "tv" };

function isMovieListResult(
  type: "movie" | "tv",
  result: MediaResult,
): result is MovieResult {
  return type === "movie";
}

export const mediaList = (params: MovieListParams | TvShowListParams) => {
  return infiniteQueryOptions({
    queryKey: [{ query: "mediaList", ...tmdbScope, ...params }],
    initialPageParam: params.page,
    queryFn: async ({ pageParam }) => {
      if (params.type === "tv") {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchTvShowList>(
          "/api/tmdb/tv-show-list",
          { ...queryParams, page: pageParam },
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchMovieList>(
          "/api/tmdb/movie-list",
          { ...queryParams, page: pageParam },
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
          isMovieListResult(params.type, media)
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
              },
        );
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values(),
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
        return apiRequestWrapper<typeof fetchSimilarTvShows>(
          "/api/tmdb/similar-tv-shows",
          { ...queryParams, seriesId: id, page: pageParam },
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchSimilarMovies>(
          "/api/tmdb/similar-movies",
          { ...queryParams, movieId: id, page: pageParam },
        );
      }
    },
    getPreviousPageParam: (firstPage) =>
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages > lastPage.page ? lastPage.page + 1 : undefined,
    select: (data: { pages: Array<{ results?: MediaResult[] }> }) => {
      const mediaList = data.pages
        .flatMap<MediaResult>((page) => page.results ?? [])
        .map<MediaListItem>((media) =>
          isMovieListResult(params.type, media)
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
              },
        );
      // Removes duplicates
      return Array.from(
        new Map(mediaList.map((media) => [media.id, media])).values(),
      );
    },
  });
};

export const configuration = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: async () =>
    apiRequestWrapper<typeof fetchConfiguration>(
      "/api/tmdb/get-configuration",
      undefined,
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
        return apiRequestWrapper<typeof fetchTvShowGenres>(
          "/api/tmdb/tv-genres",
          queryParams,
        );
      } else {
        const { type, ...queryParams } = params;
        return apiRequestWrapper<typeof fetchMovieGenres>(
          "/api/tmdb/movie-genres",
          queryParams,
        );
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
