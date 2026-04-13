import "server-only";
import type { QueryResult } from "@upstash/vector";
import type { SupportedLocale } from "#src/types.ts";
import { getVectorIndex } from "./client";
import type {
  MediaMetadata,
  VectorSearchFilters,
  VectorSearchResult,
} from "./types";

const DEFAULT_TOP_K = 10;
const MAX_TOP_K = 50;

export function buildFilterString(
  filters: VectorSearchFilters,
): string | undefined {
  const conditions: string[] = [];

  if (filters.mediaType) {
    conditions.push(`mediaType = "${sanitizeFilterValue(filters.mediaType)}"`);
  }

  if (filters.genreIds) {
    for (const id of filters.genreIds) {
      conditions.push(`genreIds CONTAINS ${String(id)}`);
    }
  }

  if (filters.releaseYearMin !== undefined) {
    conditions.push(`releaseYear >= ${String(filters.releaseYearMin)}`);
  }

  if (filters.releaseYearMax !== undefined) {
    conditions.push(`releaseYear <= ${String(filters.releaseYearMax)}`);
  }

  if (filters.voteAverageMin !== undefined) {
    conditions.push(`voteAverage >= ${String(filters.voteAverageMin)}`);
  }

  if (filters.originalLanguage) {
    conditions.push(
      `originalLanguage = "${sanitizeFilterValue(filters.originalLanguage)}"`,
    );
  }

  if (filters.directorIds) {
    for (const id of filters.directorIds) {
      conditions.push(`directorIds CONTAINS ${String(id)}`);
    }
  }

  if (filters.castIds) {
    for (const id of filters.castIds) {
      conditions.push(`castIds CONTAINS ${String(id)}`);
    }
  }

  if (filters.streamingPlatforms) {
    for (const platform of filters.streamingPlatforms) {
      conditions.push(
        `streamingPlatforms CONTAINS "${sanitizeFilterValue(platform)}"`,
      );
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}

// Upstash Vector filter strings have no escape mechanism for quote characters.
// Empirically verified: \' and \" are NOT recognized as escape sequences.
// Strategy: use double-quote delimiters and strip double quotes from values.
// Single quotes, backslashes, and all other characters are safe inside "...".
function sanitizeFilterValue(value: string): string {
  return value.replace(/"/g, "");
}

export function mapQueryResult(
  result: QueryResult<MediaMetadata>,
): VectorSearchResult | null {
  if (!result.metadata) {
    return null;
  }
  const meta = result.metadata;
  return {
    id: String(result.id),
    score: result.score,
    tmdbId: meta.tmdbId,
    mediaType: meta.mediaType,
    title: meta.title,
    overview: meta.overview,
    releaseYear: meta.releaseYear,
    voteAverage: meta.voteAverage,
    posterPath: meta.posterPath,
    genreIds: meta.genreIds,
    directors: meta.directors,
    cast: meta.cast,
    streamingPlatforms: meta.streamingPlatforms,
  };
}

export async function searchSimilar(
  query: string,
  locale: SupportedLocale,
  options?: { filters?: VectorSearchFilters; topK?: number },
): Promise<VectorSearchResult[]> {
  const index = getVectorIndex();
  const topK = Math.min(options?.topK ?? DEFAULT_TOP_K, MAX_TOP_K);
  const filter = options?.filters
    ? buildFilterString(options.filters)
    : undefined;

  const results = await index.namespace(locale).query<MediaMetadata>({
    data: query,
    topK,
    filter,
    includeMetadata: true,
  });

  return results
    .map(mapQueryResult)
    .filter((r): r is VectorSearchResult => r !== null);
}
