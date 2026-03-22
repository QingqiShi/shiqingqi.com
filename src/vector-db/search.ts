import "server-only";
import type { QueryResult } from "@upstash/vector";
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
    conditions.push(`mediaType = '${filters.mediaType}'`);
  }

  if (filters.genreIds) {
    for (const id of filters.genreIds) {
      conditions.push(`genreIds CONTAINS ${id}`);
    }
  }

  if (filters.releaseYearMin !== undefined) {
    conditions.push(`releaseYear >= ${filters.releaseYearMin}`);
  }

  if (filters.releaseYearMax !== undefined) {
    conditions.push(`releaseYear <= ${filters.releaseYearMax}`);
  }

  if (filters.voteAverageMin !== undefined) {
    conditions.push(`voteAverage >= ${filters.voteAverageMin}`);
  }

  if (filters.originalLanguage) {
    conditions.push(
      `originalLanguage = '${escapeFilterValue(filters.originalLanguage)}'`,
    );
  }

  if (filters.directors) {
    for (const director of filters.directors) {
      conditions.push(`directors CONTAINS '${escapeFilterValue(director)}'`);
    }
  }

  if (filters.cast) {
    for (const actor of filters.cast) {
      conditions.push(`cast CONTAINS '${escapeFilterValue(actor)}'`);
    }
  }

  if (filters.streamingPlatforms) {
    for (const platform of filters.streamingPlatforms) {
      conditions.push(
        `streamingPlatforms CONTAINS '${escapeFilterValue(platform)}'`,
      );
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}

function escapeFilterValue(value: string): string {
  // Escape backslashes first, then single quotes.
  // Order matters: escaping quotes first would produce \\' from \',
  // which a parser could interpret as (escaped-backslash)(end-of-string).
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
  options?: { filters?: VectorSearchFilters; topK?: number },
): Promise<VectorSearchResult[]> {
  const index = getVectorIndex();
  const topK = Math.min(options?.topK ?? DEFAULT_TOP_K, MAX_TOP_K);
  const filter = options?.filters
    ? buildFilterString(options.filters)
    : undefined;

  const results = await index.query<MediaMetadata>({
    data: query,
    topK,
    filter,
    includeMetadata: true,
  });

  return results
    .map(mapQueryResult)
    .filter((r): r is VectorSearchResult => r !== null);
}
