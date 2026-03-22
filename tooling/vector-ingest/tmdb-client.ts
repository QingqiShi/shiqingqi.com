import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import type { RateLimiter } from "./rate-limiter.ts";
import type {
  DailyExportEntry,
  TmdbChangesResponse,
  TmdbMovieDetail,
  TmdbTvDetail,
} from "./tmdb-types.ts";

const TMDB_API_BASE = "https://api.themoviedb.org";
const TMDB_EXPORT_BASE = "https://files.tmdb.org/p/exports";

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
    const dateStr = `${month}_${day}_${year}`;

    const exportType = type === "movie" ? "movie_ids" : "tv_series_ids";
    const url = `${TMDB_EXPORT_BASE}/${exportType}_${dateStr}.json.gz`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download daily export: ${response.status} ${response.statusText} (${url})`,
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
      const entry = JSON.parse(trimmed) as DailyExportEntry;
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
      `/3/movie/${movieId}?append_to_response=credits,keywords,watch/providers&language=${language}`,
    );
  }

  async fetchTvDetail(tvId: number, language: string): Promise<TmdbTvDetail> {
    await this.rateLimiter.acquire();
    return this.apiFetch<TmdbTvDetail>(
      `/3/tv/${tvId}?append_to_response=credits,keywords,watch/providers&language=${language}`,
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
        `/3/${type}/changes?start_date=${startDate}&end_date=${endDate}&page=${page}`,
      );
      for (const result of response.results ?? []) {
        ids.add(result.id);
      }
      totalPages = response.total_pages;
      page++;
    }

    return [...ids];
  }

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
          `TMDB rate limit exceeded after ${MAX_RETRIES} retries (${path})`,
        );
      }
      this.rateLimiter.onRateLimited();
      await this.rateLimiter.acquire();
      return this.apiFetch<T>(path, retries + 1);
    }

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText} (${path})`,
      );
    }

    this.rateLimiter.resetBackoff();
    return (await response.json()) as T;
  }
}
