import type { MediaMetadata } from "@repo/tmdb-types/vector-db";
import {
  composeEmbeddingText,
  extractCast,
  extractDirectors,
  extractKeywordsFromMovie,
  extractKeywordsFromTv,
  extractStreamingPlatforms,
} from "./compose-embedding-text.ts";
import type { TmdbMovieDetail, TmdbTvDetail } from "./tmdb-types.ts";

export type VectorRecord = {
  id: string;
  data: string;
  metadata: MediaMetadata;
};

function parseYear(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const year = parseInt(dateStr.substring(0, 4), 10);
  return Number.isNaN(year) ? 0 : year;
}

export function transformMovie(detail: TmdbMovieDetail): VectorRecord {
  const directors = extractDirectors(detail.credits.crew ?? [], "movie");
  const cast = extractCast(detail.credits.cast ?? []);
  const platforms = extractStreamingPlatforms(
    detail["watch/providers"].results,
  );
  const keywords = extractKeywordsFromMovie(detail);
  const genres = (detail.genres ?? []).flatMap((g) => (g.name ? [g.name] : []));

  return {
    id: `movie-${String(detail.id)}`,
    data: composeEmbeddingText({
      title: detail.title ?? "",
      originalTitle: detail.original_title ?? "",
      overview: detail.overview ?? "",
      genres,
      keywords,
    }),
    metadata: {
      tmdbId: detail.id,
      mediaType: "movie",
      title: detail.title ?? "",
      originalTitle: detail.original_title ?? "",
      overview: detail.overview ?? "",
      genreIds: (detail.genres ?? []).map((g) => g.id),
      releaseYear: parseYear(detail.release_date),
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

export function transformTv(detail: TmdbTvDetail): VectorRecord {
  const directors = extractDirectors(detail.credits.crew ?? [], "tv");
  const cast = extractCast(detail.credits.cast ?? []);
  const platforms = extractStreamingPlatforms(
    detail["watch/providers"].results,
  );
  const keywords = extractKeywordsFromTv(detail);
  const genres = (detail.genres ?? []).flatMap((g) => (g.name ? [g.name] : []));

  return {
    id: `tv-${String(detail.id)}`,
    data: composeEmbeddingText({
      title: detail.name ?? "",
      originalTitle: detail.original_name ?? "",
      overview: detail.overview ?? "",
      genres,
      keywords,
    }),
    metadata: {
      tmdbId: detail.id,
      mediaType: "tv",
      title: detail.name ?? "",
      originalTitle: detail.original_name ?? "",
      overview: detail.overview ?? "",
      genreIds: (detail.genres ?? []).map((g) => g.id),
      releaseYear: parseYear(detail.first_air_date),
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
