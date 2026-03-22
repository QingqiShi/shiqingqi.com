import { Index } from "@upstash/vector";
import "server-only";
import type { MediaMetadata } from "./types";

let index: Index<MediaMetadata> | null = null;

export function getVectorIndex(): Index<MediaMetadata> {
  if (!index) {
    if (!process.env.UPSTASH_VECTOR_REST_URL) {
      throw new Error("UPSTASH_VECTOR_REST_URL is not set");
    }
    if (!process.env.UPSTASH_VECTOR_REST_TOKEN) {
      throw new Error("UPSTASH_VECTOR_REST_TOKEN is not set");
    }
    index = new Index<MediaMetadata>({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
  }
  return index;
}
