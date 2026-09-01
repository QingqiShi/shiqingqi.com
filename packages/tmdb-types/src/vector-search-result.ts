import type { MediaMetadata } from "./media-metadata";

export type VectorSearchResult = Pick<
  MediaMetadata,
  | "tmdbId"
  | "mediaType"
  | "title"
  | "overview"
  | "releaseYear"
  | "voteAverage"
  | "posterPath"
  | "genreIds"
  | "directors"
  | "cast"
  | "streamingPlatforms"
> & { id: string; score: number };
