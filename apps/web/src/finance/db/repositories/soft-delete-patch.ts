import { sql, type SQL } from "drizzle-orm";

/** The `deleted_at` change for an upsert's `deleted` flag: none when it is absent. */
export function softDeletePatch(deleted: boolean | undefined): {
  deletedAt?: SQL | null;
} {
  if (deleted === undefined) return {};
  return { deletedAt: deleted ? sql`now()` : null };
}
