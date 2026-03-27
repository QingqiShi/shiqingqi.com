import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type {
  discoverMovies,
  discoverTvShows,
  getConfiguration,
  getMovieDetails,
  getMovieGenres,
  getMovieRecommendations,
  getMovieVideos,
  getTvShowDetails,
  getTvShowGenres,
  getTvShowRecommendations,
  getTvShowVideos,
} from "../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "./api-request-wrapper";
import type { QueryParams, ResponseType } from "./tmdb-client";
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
  return "title" in result;
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
          { ...queryParams, page: pageParam },
        );
      } else {
        const { page, type, ...queryParams } = params;
        return apiRequestWrapper<typeof discoverMovies>(
          "/api/tmdb/discover-movies",
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
          isMovieListResult(media)
            ? {
                id: media.id,
                title: media.title,
                posterPath: media.poster_path,
                rating: media.vote_average,
                mediaType: params.type,
              }
            : {
                id: media.id,
                title: media.name,
                posterPath: media.poster_path,
                rating: media.vote_average,
                mediaType: params.type,
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
        return apiRequestWrapper<typeof getTvShowRecommendations>(
          "/api/tmdb/get-tv-show-recommendations",
          {
            ...queryParams,
            series_id: id,
            page: pageParam,
          },
        );
      } else {
        const { page, type, id, ...queryParams } = params;
        return apiRequestWrapper<typeof getMovieRecommendations>(
          "/api/tmdb/get-movie-recommendations",
          {
            ...queryParams,
            movie_id: id,
            page: pageParam,
          },
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
                mediaType: params.type,
              }
            : {
                id: media.id,
                title: media.name,
                posterPath: media.poster_path,
                rating: media.vote_average,
                mediaType: params.type,
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
    apiRequestWrapper<typeof getConfiguration>(
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

function formatMovieRuntime(minutes: number, language?: string) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Intl.DurationFormat(language, { style: "narrow" }).format({
    hours,
    minutes: mins,
  });
}

type MediaDetailParams = {
  type: "movie" | "tv";
  id: string;
  language?: string;
};

export interface NormalizedMediaDetail {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string | undefined;
  duration: string;
  genreText: string;
  overview: string | null;
  tagline: string | null;
  voteAverage: number;
  voteCount: number;
}

export const mediaDetail = (params: MediaDetailParams) =>
  queryOptions({
    queryKey: [{ query: "mediaDetail", ...tmdbScope, ...params }],
    queryFn: async (): Promise<NormalizedMediaDetail> => {
      const genreSeparator = params.language === "zh" ? "、" : ", ";
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
          year: data.first_air_date?.split("-")[0],
          duration: data.number_of_seasons
            ? `${data.number_of_seasons}${params.language === "zh" ? " 季" : " seasons"}`
            : "",
          genreText:
            data.genres
              ?.map((g) => g.name)
              .filter((n): n is string => n !== undefined)
              .join(genreSeparator) ?? "",
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
        year: data.release_date?.split("-")[0],
        duration: formatMovieRuntime(data.runtime, params.language),
        genreText:
          data.genres
            ?.map((g) => g.name)
            .filter((n): n is string => n !== undefined)
            .join(genreSeparator) ?? "",
        overview: data.overview ?? null,
        tagline: data.tagline ?? null,
        voteAverage: data.vote_average,
        voteCount: data.vote_count,
      };
    },
  });

export const mediaVideos = (params: MediaDetailParams) =>
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
