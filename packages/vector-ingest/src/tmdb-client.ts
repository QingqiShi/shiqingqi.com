import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import type { RateLimiter } from "./rate-limiter.ts";
import {
  type DailyExportEntry,
  type TmdbChangesResponse,
  type TmdbMovieDetail,
  type TmdbTrendingResponse,
  type TmdbTvDetail,
  dailyExportEntrySchema,
} from "./tmdb-types.ts";

const TMDB_API_BASE = "https://api.themoviedb.org";
const TMDB_EXPORT_BASE = "https://files.tmdb.org/p/exports";

export class TmdbApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, path: string, statusText: string) {
    super(`TMDB API error: ${String(statusCode)} ${statusText} (${path})`);
    this.statusCode = statusCode;
  }
}

export class TmdbClient {
  apiToken: string;
  rateLimiter: RateLimiter;

  constructor(apiToken: string, rateLimiter: RateLimiter) {
    this.apiToken = apiToken;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Download and parse a TMDB daily export file.
   * Files are gzipped JSON lines at files.tmdb.org/p/exports/.
   * Generated daily ~7-8 AM UTC, retained for 3 months.
   */
  async downloadDailyExport(
    type: "movie" | "tv",
    date: Date,
  ): Promise<DailyExportEntry[]> {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const dateStr = `${month}_${day}_${String(year)}`;

    const exportType = type === "movie" ? "movie_ids" : "tv_series_ids";
    const url = `${TMDB_EXPORT_BASE}/${exportType}_${dateStr}.json.gz`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download daily export: ${String(response.status)} ${response.statusText} (${url})`,
      );
    }

    const buffer = await response.arrayBuffer();
    const entries: DailyExportEntry[] = [];

    const gunzip = createGunzip();
    const readable = Readable.from(Buffer.from(buffer));
    const rl = createInterface({
      input: readable.pipe(gunzip),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const entry = dailyExportEntrySchema.parse(JSON.parse(trimmed));
      entries.push(entry);
    }

    return entries;
  }

  async fetchMovieDetail(
    movieId: number,
    language: string,
  ): Promise<TmdbMovieDetail> {
    await this.rateLimiter.acquire();
    return this.apiFetch<TmdbMovieDetail>(
      `/3/movie/${String(movieId)}?append_to_response=credits,keywords,watch/providers&language=${language}`,
    );
  }

  async fetchTvDetail(tvId: number, language: string): Promise<TmdbTvDetail> {
    await this.rateLimiter.acquire();
    return this.apiFetch<TmdbTvDetail>(
      `/3/tv/${String(tvId)}?append_to_response=credits,keywords,watch/providers&language=${language}`,
    );
  }

  /**
   * Fetch changed IDs from TMDB's changes endpoint.
   * Returns IDs changed in the given date range (max 14 days).
   */
  async fetchChanges(
    type: "movie" | "tv",
    startDate: string,
    endDate: string,
  ): Promise<number[]> {
    const ids = new Set<number>();
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      await this.rateLimiter.acquire();
      const response = await this.apiFetch<TmdbChangesResponse>(
        `/3/${type}/changes?start_date=${startDate}&end_date=${endDate}&page=${String(page)}`,
      );
      for (const result of response.results ?? []) {
        ids.add(result.id);
      }
      totalPages = response.total_pages;
      page++;
    }

    return [...ids];
  }

  /**
   * Fetch trending movie or TV IDs from TMDB's trending endpoint.
   * Uses the "day" time window and returns up to `limit` unique IDs.
   */
  async fetchTrending(type: "movie" | "tv", limit: number): Promise<number[]> {
    const ids: number[] = [];
    let page = 1;
    const path = type === "movie" ? "movie" : "tv";

    while (ids.length < limit) {
      await this.rateLimiter.acquire();
      const response = await this.apiFetch<TmdbTrendingResponse>(
        `/3/trending/${path}/day?page=${String(page)}`,
      );
      for (const result of response.results ?? []) {
        ids.push(result.id);
        if (ids.length >= limit) break;
      }
      if (page >= response.total_pages) break;
      page++;
    }

    return ids;
  }

  // TMDB API responses are typed via auto-generated OpenAPI definitions.
  // Full Zod validation is impractical (22k lines of generated types).
  // We trust the API contract; daily exports use Zod at their boundary.
  async apiFetch<T>(path: string, retries = 0): Promise<T> {
    const MAX_RETRIES = 5;
    const url = `${TMDB_API_BASE}${path}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (response.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new Error(
          `TMDB rate limit exceeded after ${String(MAX_RETRIES)} retries (${path})`,
        );
      }
      this.rateLimiter.onRateLimited();
      await this.rateLimiter.acquire();
      return this.apiFetch(path, retries + 1);
    }

    if (!response.ok) {
      throw new TmdbApiError(response.status, path, response.statusText);
    }

    this.rateLimiter.resetBackoff();
    // response.json() returns Promise<any>. We trust the TMDB OpenAPI contract
    // for typing; full Zod validation is impractical for 22k lines of generated types.

    return response.json();
  }
}
