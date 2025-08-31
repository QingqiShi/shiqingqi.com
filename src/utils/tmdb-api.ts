"use server";

import "server-only";
import { cache } from "react";
import type { z } from "zod";
import type {
  genreMovieListQueryParams,
  genreTvListQueryParams,
  movieDetailsQueryParams,
  movieRecommendationsQueryParams,
  tvSeriesDetailsQueryParams,
  tvSeriesRecommendationsQueryParams,
  discoverMovieResponse,
  discoverTvResponse,
  genreMovieListResponse,
  genreTvListResponse,
  movieSimilarResponse,
  tvSeriesSimilarResponse,
  configurationDetailsResponse,
} from "@/_generated/tmdb-zod-schemas";
import {
  discoverMovieQueryParams,
  discoverTvQueryParams,
} from "@/_generated/tmdb-zod-schemas";
import { buildTmdbUrl } from "./build-tmdb-url";
import type {
  MediaListItem,
  MovieDetails,
  MovieVideos,
  TvShowDetails,
  TvShowVideos,
} from "./types";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

/** Fetch TMDB configurations containing available image sizes */
export const fetchConfiguration = cache(async function fetchConfiguration() {
  const url = buildTmdbUrl({ baseUrl: `${BASE_URL}/3/configuration` });
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch TMDB configurations. (${response.status}:${response.statusText})`
    );
  }
  return (await response.json()) as z.infer<
    typeof configurationDetailsResponse
  >;
});

/** Fetch list of movies */
export const fetchMovieList = cache(async function fetchMovieList(
  params: Partial<z.infer<typeof discoverMovieQueryParams>>
) {
  const validatedParams = discoverMovieQueryParams.parse(params);
  const {
    language,
    page,
    with_genres,
    sort_by,
    "vote_count.gte": voteCountGte,
    "vote_average.gte": voteAverageGte,
  } = validatedParams;
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/discover/movie`,
    params: {
      language,
      page,
      with_genres,
      sort_by,
      "vote_count.gte": voteCountGte,
      "vote_average.gte": voteAverageGte,
    },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movies. (${response.status}:${response.statusText})`
    );
  }

  const result = (await response.json()) as z.infer<
    typeof discoverMovieResponse
  >;
  return {
    ...result,
    results: result.results
      ?.filter(
        (movie): movie is typeof movie & { id: number } =>
          movie.id !== undefined
      )
      ?.map(
        (movie) =>
          ({
            id: movie.id,
            title: movie.title,
            posterPath: movie.poster_path,
            rating: movie.vote_average,
          }) satisfies MediaListItem
      ),
  };
});

export const fetchMovieGenres = cache(async function fetchMovieGenres({
  language,
}: z.infer<typeof genreMovieListQueryParams>) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/genre/movie/list`,
    params: { language },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movie genres. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as z.infer<typeof genreMovieListResponse>;
});

export const fetchMovieDetails = cache(async function fetchMovieDetails(
  movieId: string,
  { language }: z.infer<typeof movieDetailsQueryParams>
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}`,
    params: { language },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movie details. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as MovieDetails;
});

export const fetchMovieVideos = cache(async function fetchMovieVideos(
  movieId: string
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}/videos`,
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movie videos. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as MovieVideos;
});

export const fetchSimilarMovies = cache(async function fetchSimilarMovies({
  movieId,
  page,
  language,
}: z.infer<typeof movieRecommendationsQueryParams> & { movieId: string }) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}/recommendations`,
    params: { language, page },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch similar movies. (${response.status}:${response.statusText})`
    );
  }

  const result = (await response.json()) as z.infer<
    typeof movieSimilarResponse
  >;
  return {
    ...result,
    results: result.results
      ?.filter(
        (movie): movie is typeof movie & { id: number } =>
          movie.id !== undefined
      )
      ?.map(
        (movie) =>
          ({
            id: movie.id,
            title: movie.title,
            posterPath: movie.poster_path,
            rating: movie.vote_average,
          }) satisfies MediaListItem
      ),
  };
});

/** Fetch list of TV shows */
export const fetchTvShowList = cache(async function fetchTvShowList(
  params: Partial<z.infer<typeof discoverTvQueryParams>>
) {
  const validatedParams = discoverTvQueryParams.parse(params);
  const {
    language,
    page,
    with_genres,
    sort_by,
    "vote_count.gte": voteCountGte,
    "vote_average.gte": voteAverageGte,
  } = validatedParams;
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/discover/tv`,
    params: {
      language,
      page,
      with_genres,
      sort_by,
      "vote_count.gte": voteCountGte,
      "vote_average.gte": voteAverageGte,
    },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch TV shows. (${response.status}:${response.statusText})`
    );
  }

  const result = (await response.json()) as z.infer<typeof discoverTvResponse>;
  return {
    ...result,
    results: result.results
      ?.filter(
        (tvShow): tvShow is typeof tvShow & { id: number } =>
          tvShow.id !== undefined
      )
      ?.map(
        (tvShow) =>
          ({
            id: tvShow.id,
            title: tvShow.name,
            posterPath: tvShow.poster_path,
            rating: tvShow.vote_average,
          }) satisfies MediaListItem
      ),
  };
});

export const fetchTvShowGenres = cache(async function fetchTvShowGenres({
  language,
}: z.infer<typeof genreTvListQueryParams>) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/genre/tv/list`,
    params: { language },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch TV show genres. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as z.infer<typeof genreTvListResponse>;
});

export const fetchTvShowDetails = cache(async function fetchTvShowDetails(
  seriesId: string,
  { language }: z.infer<typeof tvSeriesDetailsQueryParams>
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/tv/${seriesId}`,
    params: { language },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch TV show details. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as TvShowDetails;
});

export const fetchTvShowVideos = cache(async function fetchTvShowVideos(
  seriesId: string
) {
  const url = buildTmdbUrl({ baseUrl: `${BASE_URL}/3/tv/${seriesId}/videos` });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch TV show videos. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as TvShowVideos;
});

export const fetchSimilarTvShows = cache(async function fetchSimilarTvShows({
  seriesId,
  page,
  language,
}: z.infer<typeof tvSeriesRecommendationsQueryParams> & { seriesId: string }) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/tv/${seriesId}/recommendations`,
    params: { language, page },
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch similar TV shows. (${response.status}:${response.statusText})`
    );
  }

  const result = (await response.json()) as z.infer<
    typeof tvSeriesSimilarResponse
  >;
  return {
    ...result,
    results: result.results
      ?.filter(
        (tvShow): tvShow is typeof tvShow & { id: number } =>
          tvShow.id !== undefined
      )
      ?.map(
        (tvShow) =>
          ({
            id: tvShow.id,
            title: tvShow.name,
            posterPath: tvShow.poster_path,
            rating: tvShow.vote_average,
          }) satisfies MediaListItem
      ),
  };
});
