import { buildVectorRecord } from "./build-vector-record.ts";
import { extractKeywordsFromTv } from "./compose-embedding-text.ts";
import type { TmdbTvDetail } from "./types.ts";
import type { VectorRecord } from "./vector-record.ts";

export function transformTv(detail: TmdbTvDetail): VectorRecord {
  return buildVectorRecord({
    mediaType: "tv",
    detail,
    title: detail.name ?? "",
    originalTitle: detail.original_name ?? "",
    releaseDate: detail.first_air_date,
    keywords: extractKeywordsFromTv(detail),
  });
}
