"use server";

import "server-only";
import { cache } from "react";
import type { paths } from "@/_generated/tmdbV3";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

export type Configuration =
  paths["/3/configuration"]["get"]["responses"]["200"]["content"]["application/json"];

/** Fetch TMDB configurations containing available image sizes */
export async function fetchConfiguration() {
  const response = await fetch(`${BASE_URL}/3/configuration`, {
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
  return (await response.json()) as Configuration;
}

export type MovieListItem = {
  id: number;
  title?: string;
  posterPath?: string;
  rating?: number;
};

/** Fetch list of movies */
export const fetchMovieList = cache(async function fetchMovieList({
  language,
  page,
  with_genres,
  sort_by,
  "vote_count.gte": voteCountGte = 300,
  "vote_average.gte": voteAverageGte = 3,
}: NonNullable<paths["/3/discover/movie"]["get"]["parameters"]["query"]>) {
  const url = new URL(`${BASE_URL}/3/discover/movie`);
  if (language && language !== "en") url.searchParams.set("language", language);
  if (page) url.searchParams.set("page", page.toString());
  if (with_genres) url.searchParams.set("with_genres", with_genres);
  if (sort_by) url.searchParams.set("sort_by", sort_by);
  if (voteCountGte)
    url.searchParams.set("vote_count.gte", voteCountGte.toString());
  if (voteAverageGte)
    url.searchParams.set("vote_average.gte", voteAverageGte.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movies. (${response.status}:${response.statusText})`
    );
  }

  const result =
    (await response.json()) as paths["/3/discover/movie"]["get"]["responses"]["200"]["content"]["application/json"];
  return {
    ...result,
    results: result.results?.map(
      (movie) =>
        ({
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          rating: movie.vote_average,
        }) satisfies MovieListItem
    ),
  };
});

export type Genre = NonNullable<
  paths["/3/genre/movie/list"]["get"]["responses"]["200"]["content"]["application/json"]["genres"]
>[number];

export const fetchMovieGenres = cache(async function fetchMovieGenres({
  language,
}: NonNullable<paths["/3/genre/movie/list"]["get"]["parameters"]["query"]>) {
  const url = new URL(`${BASE_URL}/3/genre/movie/list`);
  if (language && language !== "en") url.searchParams.set("language", language);

  const response = await fetch(url.toString(), {
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

  return (await response.json()) as paths["/3/genre/movie/list"]["get"]["responses"]["200"]["content"]["application/json"];
});

export type MovieDetails = NonNullable<
  paths["/3/movie/{movie_id}"]["get"]["responses"]["200"]["content"]["application/json"]
>;

export const fetchMovieDetails = cache(async function fetchMovieDetails(
  movieId: string,
  {
    language,
  }: NonNullable<paths["/3/movie/{movie_id}"]["get"]["parameters"]["query"]>
) {
  const url = new URL(`${BASE_URL}/3/movie/${movieId}`);
  if (language && language !== "en") url.searchParams.set("language", language);

  const response = await fetch(url.toString(), {
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

  return (await response.json()) as MovieDetails;
});

export type MovieVideos = NonNullable<
  paths["/3/movie/{movie_id}/videos"]["get"]["responses"]["200"]["content"]["application/json"]
>;

export const fetchMovieVideos = cache(async function fetchMovieVideos(
  movieId: string
) {
  const url = new URL(`${BASE_URL}/3/movie/${movieId}/videos`);

  const response = await fetch(url.toString(), {
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

  return (await response.json()) as MovieVideos;
});

export const fetchSimilarMovies = cache(async function fetchSimilarMovies(
  movieId: string,
  {
    language,
    page,
  }: NonNullable<
    paths["/3/movie/{movie_id}/similar"]["get"]["parameters"]["query"]
  >
) {
  const url = new URL(`${BASE_URL}/3/movie/${movieId}/similar`);
  if (language && language !== "en") url.searchParams.set("language", language);
  if (page) url.searchParams.set("page", page.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 1 Hours
    cache: "force-cache",
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movie genres. (${response.status}:${response.statusText})`
    );
  }

  const result =
    (await response.json()) as paths["/3/movie/{movie_id}/similar"]["get"]["responses"]["200"]["content"]["application/json"];
  console.log(result);
  return {
    ...result,
    results: result.results?.map(
      (movie) =>
        ({
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          rating: movie.vote_average,
        }) satisfies MovieListItem
    ),
  };
});
