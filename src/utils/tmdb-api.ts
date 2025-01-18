"use server";

import "server-only";
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
};

/** Fetch list of movies */
export async function fetchMovieList({
  language,
  page,
}: NonNullable<paths["/3/discover/movie"]["get"]["parameters"]["query"]>) {
  const url = new URL(`${BASE_URL}/3/discover/movie`);
  if (language && language !== "en") url.searchParams.set("language", language);
  if (page) url.searchParams.set("page", page.toString());

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
        }) satisfies MovieListItem
    ),
  };
}
