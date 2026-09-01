import {
  composeEmbeddingText,
  extractCast,
  extractDirectors,
  extractStreamingPlatforms,
} from "./compose-embedding-text.ts";
import { parseYear } from "./parse-year.ts";
import type { TmdbMovieDetail, TmdbTvDetail } from "./types.ts";
import type { VectorRecord } from "./vector-record.ts";

interface MediaFacts {
  mediaType: "movie" | "tv";
  detail: TmdbMovieDetail | TmdbTvDetail;
  /** TMDB names these per media type, so the caller reads them. */
  title: string;
  originalTitle: string;
  releaseDate: string | undefined;
  keywords: string[];
}

/** The vector record for one title, from the fields movies and series share. */
export function buildVectorRecord({
  mediaType,
  detail,
  title,
  originalTitle,
  releaseDate,
  keywords,
}: MediaFacts): VectorRecord {
  const directors = extractDirectors(detail.credits.crew ?? [], mediaType);
  const cast = extractCast(detail.credits.cast ?? []);
  const platforms = extractStreamingPlatforms(
    detail["watch/providers"].results,
  );
  const genres = (detail.genres ?? []).flatMap((g) => (g.name ? [g.name] : []));

  return {
    id: `${mediaType}-${String(detail.id)}`,
    data: composeEmbeddingText({
      title,
      originalTitle,
      overview: detail.overview ?? "",
      genres,
      keywords,
    }),
    metadata: {
      tmdbId: detail.id,
      mediaType,
      title,
      originalTitle,
      overview: detail.overview ?? "",
      genreIds: (detail.genres ?? []).map((g) => g.id),
      releaseYear: parseYear(releaseDate),
      voteAverage: detail.vote_average,
      voteCount: detail.vote_count,
      popularity: detail.popularity,
      posterPath: detail.poster_path ?? null,
      originalLanguage: detail.original_language ?? "",
      directorIds: directors.ids,
      directors: directors.names,
      castIds: cast.ids,
      cast: cast.names,
      streamingPlatforms: platforms,
    },
  };
}
