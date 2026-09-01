import { isRecord } from "#src/utils/is-record.ts";
import type { StoredPreference } from "./types";

const validCategories: ReadonlySet<string> = new Set([
  "genre",
  "actor",
  "director",
  "content_rating",
  "language",
  "keyword",
]);
const validSentiments: ReadonlySet<string> = new Set(["like", "dislike"]);

/**
 * Runtime type guard for StoredPreference.
 *
 * IndexedDB returns untyped data — values could be corrupted or left over
 * from a previous schema version. This guard filters out malformed entries
 * so callers never see invalid shapes.
 */
export function isStoredPreference(value: unknown): value is StoredPreference {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.category === "string" &&
    validCategories.has(value.category) &&
    typeof value.value === "string" &&
    typeof value.sentiment === "string" &&
    validSentiments.has(value.sentiment) &&
    typeof value.updatedAt === "number"
  );
}
