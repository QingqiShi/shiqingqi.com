import { getTableName, sql } from "drizzle-orm";
import { buddyUsageDays, machines } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { readSnapshots } from "../snapshot/read-snapshots.ts";
import type { BuddyKv } from "../store/types.ts";

const CHUNK_SIZE = 1000;
const SNAPSHOTS_PER_READ = 50;
const TABLE = getTableName(buddyUsageDays);

type UsageDayRow = typeof buddyUsageDays.$inferInsert;

const greatest = (column: string) =>
  sql.raw(`greatest(${TABLE}.${column}, excluded.${column})`);

/**
 * Upserts the rows, each column the larger of the stored and the new value,
 * as a day's counts only grow. A row changes only when a value grows, so a
 * daily run over every day rewrites only the days that changed.
 */
export async function upsertUsageDays(
  db: BuddyDb,
  rows: readonly UsageDayRow[],
) {
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    await db
      .insert(buddyUsageDays)
      .values(rows.slice(start, start + CHUNK_SIZE))
      .onConflictDoUpdate({
        target: [
          buddyUsageDays.userId,
          buddyUsageDays.machineId,
          buddyUsageDays.day,
        ],
        set: {
          tokens: greatest("tokens"),
          costUsd: greatest("cost_usd"),
          cacheRead: greatest("cache_read"),
          promptTokens: greatest("prompt_tokens"),
          archivedAt: sql`now()`,
        },
        setWhere: sql.raw(
          ["tokens", "cost_usd", "cache_read", "prompt_tokens"]
            .map(
              (column) =>
                `excluded.${column} > coalesce(${TABLE}.${column}, -1)`,
            )
            .join(" or "),
        ),
      });
  }
}

/** Copies every day of every Mac that ever connected from its Redis snapshot into Postgres. */
export async function archiveUsageDays(kv: BuddyKv, db: BuddyDb) {
  const macs = await db
    .select({ userId: machines.userId, machineId: machines.machineId })
    .from(machines);
  let rows = 0;
  for (let start = 0; start < macs.length; start += SNAPSHOTS_PER_READ) {
    const chunk = macs.slice(start, start + SNAPSHOTS_PER_READ);
    const snapshots = await readSnapshots(
      kv,
      chunk.map((mac) => mac.machineId),
    );
    const chunkRows = chunk.flatMap(({ userId, machineId }) =>
      (snapshots.get(machineId)?.days ?? []).map((day): UsageDayRow => ({
        userId,
        machineId,
        day: day.day,
        tokens: day.tokens,
        costUsd: day.costUsd,
        cacheRead: day.cacheRead ?? null,
        promptTokens: day.promptTokens ?? null,
      })),
    );
    await upsertUsageDays(db, chunkRows);
    rows += chunkRows.length;
  }
  return rows;
}
