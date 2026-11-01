import { inSavepoint, type UserDb } from "#src/assistant/db/with-user.ts";

/**
 * Runs `store` on all `items` in one savepoint. When that fails, it runs
 * `store` on each item in its own savepoint, and an item that fails alone
 * goes to `fallback`: one bad mail cannot stop a cursor. An error in
 * `fallback` stops the whole write, as when the database is down.
 */
export async function storeIsolated<Item, Result>(
  db: UserDb,
  items: readonly Item[],
  store: (db: UserDb, items: readonly Item[]) => Promise<Result[]>,
  fallback: (db: UserDb, item: Item, error: unknown) => Promise<Result[]>,
): Promise<Result[]> {
  if (items.length === 0) return [];
  try {
    return await inSavepoint(db, (scoped) => store(scoped, items));
  } catch {
    const results: Result[] = [];
    for (const item of items) {
      try {
        results.push(
          ...(await inSavepoint(db, (scoped) => store(scoped, [item]))),
        );
      } catch (error) {
        results.push(
          ...(await inSavepoint(db, (scoped) => fallback(scoped, item, error))),
        );
      }
    }
    return results;
  }
}
