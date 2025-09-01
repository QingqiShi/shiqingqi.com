"use server";

import "server-only";
import { cache } from "react";
import type { paths } from "@/_generated/tmdbV3";
import { buildTmdbUrl } from "./build-tmdb-url";
import type {
  Configuration,
  MovieDetails,
  MovieVideos,
  TvShowDetails,
  TvShowVideos,
} from "./types";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

/** Shared TMDB API fetch utility */
async function tmdbFetch<T>(url: string, errorMessage: string): Promise<T> {
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
      `${errorMessage} (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as T;
}

/** Fetch TMDB configurations containing available image sizes */
export const fetchConfiguration = cache(async function fetchConfiguration() {
  const url = buildTmdbUrl({ baseUrl: `${BASE_URL}/3/configuration` });
  return tmdbFetch<Configuration>(url, "Failed to fetch TMDB configurations.");
});

/** Fetch list of movies */
export const fetchMovieList = cache(async function fetchMovieList(
  params: NonNullable<paths["/3/discover/movie"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/discover/movie`,
    params: {
      "vote_count.gte": 300,
      "vote_average.gte": 3,
      ...params,
    },
  });

  return tmdbFetch<
    paths["/3/discover/movie"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch movies.");
});

export const fetchMovieGenres = cache(async function fetchMovieGenres(
  params: NonNullable<
    paths["/3/genre/movie/list"]["get"]["parameters"]["query"]
  >,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/genre/movie/list`,
    params,
  });

  return tmdbFetch<
    paths["/3/genre/movie/list"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch movie genres.");
});

export const fetchMovieDetails = cache(async function fetchMovieDetails(
  movieId: string,
  params: NonNullable<
    paths["/3/movie/{movie_id}"]["get"]["parameters"]["query"]
  >,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}`,
    params: params,
  });

  return tmdbFetch<MovieDetails>(url, "Failed to fetch movie details.");
});

export const fetchMovieVideos = cache(async function fetchMovieVideos(
  movieId: string,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}/videos`,
  });

  return tmdbFetch<MovieVideos>(url, "Failed to fetch movie videos.");
});

export const fetchSimilarMovies = cache(async function fetchSimilarMovies({
  movieId,
  ...params
}: NonNullable<
  paths["/3/movie/{movie_id}/recommendations"]["get"]["parameters"]["query"]
> & { movieId: string }) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/movie/${movieId}/recommendations`,
    params,
  });

  return tmdbFetch<
    paths["/3/movie/{movie_id}/similar"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch similar movies.");
});

/** Fetch list of TV shows */
export const fetchTvShowList = cache(async function fetchTvShowList(
  params: NonNullable<paths["/3/discover/tv"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/discover/tv`,
    params: {
      "vote_count.gte": 300,
      "vote_average.gte": 3,
      ...params,
    },
  });

  return tmdbFetch<
    paths["/3/discover/tv"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch TV shows.");
});

export const fetchTvShowGenres = cache(async function fetchTvShowGenres(
  params: NonNullable<paths["/3/genre/tv/list"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/genre/tv/list`,
    params,
  });

  return tmdbFetch<
    paths["/3/genre/tv/list"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch TV show genres.");
});

export const fetchTvShowDetails = cache(async function fetchTvShowDetails(
  seriesId: string,
  params: NonNullable<paths["/3/tv/{series_id}"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/tv/${seriesId}`,
    params,
  });

  return tmdbFetch<TvShowDetails>(url, "Failed to fetch TV show details.");
});

export const fetchTvShowVideos = cache(async function fetchTvShowVideos(
  seriesId: string,
) {
  const url = buildTmdbUrl({ baseUrl: `${BASE_URL}/3/tv/${seriesId}/videos` });

  return tmdbFetch<TvShowVideos>(url, "Failed to fetch TV show videos.");
});

export const fetchSimilarTvShows = cache(async function fetchSimilarTvShows({
  seriesId,
  ...params
}: NonNullable<
  paths["/3/tv/{series_id}/recommendations"]["get"]["parameters"]["query"]
> & { seriesId: string }) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/tv/${seriesId}/recommendations`,
    params,
  });

  return tmdbFetch<
    paths["/3/tv/{series_id}/similar"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to fetch similar TV shows.");
});

/** Search for movies by title */
export const searchMoviesByTitle = cache(async function searchMoviesByTitle(
  params: NonNullable<paths["/3/search/movie"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/search/movie`,
    params,
  });

  return tmdbFetch<
    paths["/3/search/movie"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to search movies.");
});

/** Search for TV shows by title */
export const searchTvShowsByTitle = cache(async function searchTvShowsByTitle(
  params: NonNullable<paths["/3/search/tv"]["get"]["parameters"]["query"]>,
) {
  const url = buildTmdbUrl({
    baseUrl: `${BASE_URL}/3/search/tv`,
    params,
  });

  return tmdbFetch<
    paths["/3/search/tv"]["get"]["responses"]["200"]["content"]["application/json"]
  >(url, "Failed to search TV shows.");
});
