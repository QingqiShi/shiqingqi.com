import { buildVectorRecord } from "./build-vector-record.ts";
import { extractKeywordsFromMovie } from "./compose-embedding-text.ts";
import type { TmdbMovieDetail } from "./types.ts";
import type { VectorRecord } from "./vector-record.ts";

export function transformMovie(detail: TmdbMovieDetail): VectorRecord {
  return buildVectorRecord({
    mediaType: "movie",
    detail,
    title: detail.title ?? "",
    originalTitle: detail.original_title ?? "",
    releaseDate: detail.release_date,
    keywords: extractKeywordsFromMovie(detail),
  });
}
