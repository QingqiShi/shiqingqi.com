import { getTableName, sql } from "drizzle-orm";
import { careKeys, readCareCounts } from "../care/care-keys.ts";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import type { BuddyKv } from "../store/types.ts";

const ACCOUNTS_PER_READ = 100;
const TABLE = getTableName(accounts);

type CareCounts = { id: string; fed: number; patted: number };

/** Raises each account's stored counts to `counts`, never lowering one, in one statement. */
async function raiseStoredCounts(db: BuddyDb, counts: readonly CareCounts[]) {
  if (counts.length === 0) return;
  const rows = sql.join(
    counts.map(
      ({ id, fed, patted }) =>
        sql`(${id}::uuid, ${fed}::bigint, ${patted}::bigint)`,
    ),
    sql`, `,
  );
  await db.execute(sql`
    update ${accounts}
    set visitor_fed = greatest(${sql.raw(TABLE)}.visitor_fed, counted.fed),
      visitor_patted = greatest(${sql.raw(TABLE)}.visitor_patted, counted.patted)
    from (values ${rows}) as counted (id, fed, patted)
    where ${sql.raw(TABLE)}.id = counted.id`);
}

/**
 * Copies each account's visitor counts from Redis into Postgres, each the
 * larger of the two, and adds the difference to a Redis count that is missing
 * or smaller, so that a lost Redis count comes back. INCRBY adds to the
 * presses that the care route counts meanwhile, so none of them is lost.
 */
export async function archiveCareCounts(kv: BuddyKv, db: BuddyDb) {
  const stored = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      fed: accounts.visitorFed,
      patted: accounts.visitorPatted,
    })
    .from(accounts);
  for (let start = 0; start < stored.length; start += ACCOUNTS_PER_READ) {
    const chunk = stored.slice(start, start + ACCOUNTS_PER_READ);
    const counted = await readCareCounts(
      kv,
      chunk.map((account) => account.name),
    );
    const raised: CareCounts[] = [];
    const restores: (readonly [string, number])[] = [];
    for (const [index, account] of chunk.entries()) {
      const inRedis = counted[index] ?? { fed: 0, patted: 0 };
      const fed = Math.max(account.fed, inRedis.fed);
      const patted = Math.max(account.patted, inRedis.patted);
      if (fed > account.fed || patted > account.patted) {
        raised.push({ id: account.id, fed, patted });
      }
      const [fedKey, pattedKey] = careKeys(account.name);
      restores.push(
        [fedKey, fed - inRedis.fed],
        [pattedKey, patted - inRedis.patted],
      );
    }
    await raiseStoredCounts(db, raised);
    await kv.incrementBy(restores);
  }
}
