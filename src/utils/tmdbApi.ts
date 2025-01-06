import type { paths } from "@/generated/tmdbV3";
import type { SupportedLocale } from "@/types";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

/** Fetch TMDB configurations containing available image sizes */
export async function fetchConfiguration() {
  const response = await fetch(`${BASE_URL}/3/configuration`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
    // 24 Hours
    next: { revalidate: 86400 },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch TMDB configurations. (${response.status}:${response.statusText})`
    );
  }
  return (await response.json()) as paths["/3/configuration"]["get"]["responses"]["200"]["content"]["application/json"];
}

/** Fetch list of movies */
export async function fetchMovieList({ locale }: { locale: SupportedLocale }) {
  const url = new URL(`${BASE_URL}/3/discover/movie`);
  if (locale !== "en") {
    url.searchParams.set("language", locale);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch movies. (${response.status}:${response.statusText})`
    );
  }

  return (await response.json()) as paths["/3/discover/movie"]["get"]["responses"]["200"]["content"]["application/json"];
}
