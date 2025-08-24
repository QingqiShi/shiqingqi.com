"use server";

import "server-only";
import { cache } from "react";
import type { paths } from "@/_generated/tmdbV3";
import type {
  Configuration,
  MovieListItem,
  MovieDetails,
  MovieVideos,
  TvShowListItem,
  TvShowDetails,
  TvShowVideos,
} from "./types";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

/** Fetch TMDB configurations containing available image sizes */
export const fetchConfiguration = cache(async function fetchConfiguration() {
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
      `Failed to fetch TMDB configurations. (${response.status}:${response.statusText})`,
    );
  }
  return (await response.json()) as Configuration;
});

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
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movies. (${response.status}:${response.statusText})`,
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
        }) satisfies MovieListItem,
    ),
  };
});

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
      `Failed to fetch movie genres. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as paths["/3/genre/movie/list"]["get"]["responses"]["200"]["content"]["application/json"];
});

export const fetchMovieDetails = cache(async function fetchMovieDetails(
  movieId: string,
  {
    language,
  }: NonNullable<paths["/3/movie/{movie_id}"]["get"]["parameters"]["query"]>,
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
      `Failed to fetch movie details. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as MovieDetails;
});

export const fetchMovieVideos = cache(async function fetchMovieVideos(
  movieId: string,
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
      `Failed to fetch movie videos. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as MovieVideos;
});

export const fetchSimilarMovies = cache(async function fetchSimilarMovies({
  movieId,
  page,
  language,
}: NonNullable<
  paths["/3/movie/{movie_id}/recommendations"]["get"]["parameters"]["query"]
> & { movieId: string }) {
  const url = new URL(`${BASE_URL}/3/movie/${movieId}/recommendations`);
  if (language && language !== "en") url.searchParams.set("language", language);
  if (page) url.searchParams.set("page", page.toString());

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
      `Failed to fetch similar movies. (${response.status}:${response.statusText})`,
    );
  }

  const result =
    (await response.json()) as paths["/3/movie/{movie_id}/similar"]["get"]["responses"]["200"]["content"]["application/json"];
  return {
    ...result,
    results: result.results?.map(
      (movie) =>
        ({
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          rating: movie.vote_average,
        }) satisfies MovieListItem,
    ),
  };
});

/** Fetch list of TV shows */
export const fetchTvShowList = cache(async function fetchTvShowList({
  language,
  page,
  with_genres,
  sort_by,
  "vote_count.gte": voteCountGte = 300,
  "vote_average.gte": voteAverageGte = 3,
}: NonNullable<paths["/3/discover/tv"]["get"]["parameters"]["query"]>) {
  const url = new URL(`${BASE_URL}/3/discover/tv`);
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
    // 24 Hours
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch TV shows. (${response.status}:${response.statusText})`,
    );
  }

  const result =
    (await response.json()) as paths["/3/discover/tv"]["get"]["responses"]["200"]["content"]["application/json"];
  return {
    ...result,
    results: result.results?.map(
      (tvShow) =>
        ({
          id: tvShow.id,
          title: tvShow.name,
          posterPath: tvShow.poster_path,
          rating: tvShow.vote_average,
        }) satisfies TvShowListItem,
    ),
  };
});

export const fetchTvShowGenres = cache(async function fetchTvShowGenres({
  language,
}: NonNullable<paths["/3/genre/tv/list"]["get"]["parameters"]["query"]>) {
  const url = new URL(`${BASE_URL}/3/genre/tv/list`);
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
      `Failed to fetch TV show genres. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as paths["/3/genre/tv/list"]["get"]["responses"]["200"]["content"]["application/json"];
});

export const fetchTvShowDetails = cache(async function fetchTvShowDetails(
  seriesId: string,
  {
    language,
  }: NonNullable<paths["/3/tv/{series_id}"]["get"]["parameters"]["query"]>,
) {
  const url = new URL(`${BASE_URL}/3/tv/${seriesId}`);
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
      `Failed to fetch TV show details. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as TvShowDetails;
});

export const fetchTvShowVideos = cache(async function fetchTvShowVideos(
  seriesId: string,
) {
  const url = new URL(`${BASE_URL}/3/tv/${seriesId}/videos`);

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
      `Failed to fetch TV show videos. (${response.status}:${response.statusText})`,
    );
  }

  return (await response.json()) as TvShowVideos;
});

export const fetchSimilarTvShows = cache(async function fetchSimilarTvShows({
  seriesId,
  page,
  language,
}: NonNullable<
  paths["/3/tv/{series_id}/recommendations"]["get"]["parameters"]["query"]
> & { seriesId: string }) {
  const url = new URL(`${BASE_URL}/3/tv/${seriesId}/recommendations`);
  if (language && language !== "en") url.searchParams.set("language", language);
  if (page) url.searchParams.set("page", page.toString());

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
      `Failed to fetch similar TV shows. (${response.status}:${response.statusText})`,
    );
  }

  const result =
    (await response.json()) as paths["/3/tv/{series_id}/similar"]["get"]["responses"]["200"]["content"]["application/json"];
  return {
    ...result,
    results: result.results?.map(
      (tvShow) =>
        ({
          id: tvShow.id,
          title: tvShow.name,
          posterPath: tvShow.poster_path,
          rating: tvShow.vote_average,
        }) satisfies TvShowListItem,
    ),
  };
});
