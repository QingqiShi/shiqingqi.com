import { buildVectorRecord } from "./build-vector-record.ts";
import { extractKeywordsFromMovie } from "./compose-embedding-text.ts";
import type { TmdbMovieDetail, VectorRecord } from "./types.ts";

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
