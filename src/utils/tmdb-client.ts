"use server";

import "server-only";
import { cache } from "react";
import type { paths } from "@/_generated/tmdbV3";
import { buildTmdbUrl } from "./build-tmdb-url";

const BASE_URL = "https://api.themoviedb.org";
const API = process.env.TMDB_API_TOKEN;

/** Extract path parameters from a path string */
export type PathParams<T extends string> =
  T extends `${string}{${infer Param}}${infer Rest}`
    ? { [K in Param]: string } & PathParams<Rest>
    : Record<string, string>;

/** Extract query parameters for a given path and method */
export type QueryParams<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath],
> = paths[TPath][TMethod] extends { parameters: { query?: infer Q } }
  ? Q extends Record<string, unknown>
    ? Q
    : Record<string, never>
  : Record<string, never>;

/** Extract response type for a given path and method */
export type ResponseType<
  TPath extends keyof paths,
  TMethod extends keyof paths[TPath],
> = paths[TPath][TMethod] extends {
  responses: { 200: { content: { "application/json": infer R } } };
}
  ? R
  : unknown;

/** Shared TMDB API fetch utility */
async function tmdbFetch<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API}`,
    },
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

/** Generic TMDB API client - call any endpoint with full type safety */
export async function tmdbGet<TPath extends keyof paths>(
  path: TPath,
  params?: QueryParams<TPath, "get">,
  pathParams?: PathParams<TPath>,
) {
  return cache(async () => {
    // Replace path parameters
    let resolvedPath = path as string;
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        resolvedPath = resolvedPath.replace(`{${key}}`, value);
      }
    }

    const url = buildTmdbUrl({
      baseUrl: `${BASE_URL}${resolvedPath}`,
      params,
    });

    const errorMessage = `Failed to fetch ${path}`;
    return tmdbFetch<ResponseType<TPath, "get">>(url, errorMessage);
  })();
}

// Usage examples:
// tmdbGet("/3/discover/movie", { page: 1 })
// tmdbGet("/3/movie/{movie_id}", { language: "en" }, { movie_id: "123" })
// tmdbGet("/3/search/movie", { query: "batman" })
