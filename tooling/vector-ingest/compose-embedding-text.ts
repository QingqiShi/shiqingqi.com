import type {
  TmdbCastMember,
  TmdbCrewMember,
  TmdbMovieDetail,
  TmdbTvDetail,
  TmdbWatchProviderResults,
} from "./tmdb-types.ts";

const STREAMING_COUNTRY = "US";
const TOP_CAST = 10;

export type EmbeddingInput = {
  title: string;
  originalTitle: string;
  overview: string;
  genres: string[];
  keywords: string[];
};

/**
 * Compose labeled rich text for Upstash's built-in embedding model.
 * Only includes semantic content (title, overview, genres, keywords).
 * Factual attributes (cast, directors, streaming) are in metadata for filtering.
 */
export function composeEmbeddingText(input: EmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`Title: ${input.title}`);
  if (input.originalTitle && input.originalTitle !== input.title) {
    parts.push(`Original Title: ${input.originalTitle}`);
  }

  if (input.overview) {
    parts.push(`Overview: ${input.overview}`);
  }

  if (input.genres.length > 0) {
    parts.push(`Genres: ${input.genres.join(", ")}`);
  }

  if (input.keywords.length > 0) {
    parts.push(`Keywords: ${input.keywords.join(", ")}`);
  }

  return parts.join("\n");
}

export function extractKeywordsFromMovie(detail: TmdbMovieDetail): string[] {
  return (detail.keywords.keywords ?? []).flatMap((k) =>
    k.name ? [k.name] : [],
  );
}

export function extractKeywordsFromTv(detail: TmdbTvDetail): string[] {
  return (detail.keywords.results ?? []).flatMap((k) =>
    k.name ? [k.name] : [],
  );
}

export function extractDirectors(
  crew: TmdbCrewMember[],
  mediaType: "movie" | "tv",
): string[] {
  const job = mediaType === "movie" ? "Director" : "Series Director";
  const directors = crew
    .filter((c) => c.job === job)
    .flatMap((c) => (c.name ? [c.name] : []));

  // For TV, fall back to Executive Producer if no Series Director credit
  if (directors.length === 0 && mediaType === "tv") {
    return crew
      .filter((c) => c.job === "Executive Producer")
      .slice(0, 3)
      .flatMap((c) => (c.name ? [c.name] : []));
  }

  return directors;
}

export function extractCast(cast: TmdbCastMember[]): string[] {
  return cast
    .sort((a, b) => a.order - b.order)
    .slice(0, TOP_CAST)
    .flatMap((c) => (c.name ? [c.name] : []));
}

export function extractStreamingPlatforms(
  providers: TmdbWatchProviderResults | undefined,
): string[] {
  if (!providers) return [];

  const country = providers[STREAMING_COUNTRY];
  if (!country?.flatrate) return [];

  return country.flatrate.flatMap((p) =>
    p.provider_name ? [p.provider_name] : [],
  );
}
