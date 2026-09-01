import type { MediaMetadata } from "@tuja/tmdb-types/media-metadata";

export type VectorRecord = {
  id: string;
  data: string;
  metadata: MediaMetadata;
};
