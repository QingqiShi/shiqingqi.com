import { getTableColumns, getTableName, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { asArchive } from "../db/as-archive.ts";
import { buddyUsageDays, buddyUsageModels, machines } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import type { MacSnapshot } from "../snapshot/parse-snapshot.ts";
import { readSnapshots } from "../snapshot/read-snapshots.ts";
import type { BuddyKv } from "../store/types.ts";

const CHUNK_SIZE = 1000;
const SNAPSHOTS_PER_READ = 50;

type UsageDayRow = typeof buddyUsageDays.$inferInsert;
type UsageModelRow = typeof buddyUsageModels.$inferInsert;

/**
 * What an upsert does to a row that exists: each of `counts` becomes the
 * larger of the stored and the new value, as a day's counts only grow. A row
 * changes only when a value grows, so a daily run over every day rewrites
 * only the rows that changed.
 */
function keepLarger(table: PgTable, counts: readonly PgColumn[]) {
  const tableName = getTableName(table);
  const grown = Object.entries(getTableColumns(table)).filter(([, column]) =>
    counts.includes(column),
  );
  return {
    set: {
      ...Object.fromEntries(
        grown.map(([key, { name }]) => [
          key,
          sql.raw(`greatest(${tableName}.${name}, excluded.${name})`),
        ]),
      ),
      archivedAt: sql`now()`,
    },
    setWhere: sql.raw(
      grown
        .map(
          ([, { name }]) =>
            `excluded.${name} > coalesce(${tableName}.${name}, -1)`,
        )
        .join(" or "),
    ),
  };
}

async function inChunks<T>(
  rows: readonly T[],
  write: (chunk: T[]) => Promise<unknown>,
) {
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    await write(rows.slice(start, start + CHUNK_SIZE));
  }
}

export function upsertUsageDays(db: BuddyDb, rows: readonly UsageDayRow[]) {
  const counts = keepLarger(buddyUsageDays, [
    buddyUsageDays.tokens,
    buddyUsageDays.cacheRead,
    buddyUsageDays.promptTokens,
  ]);
  // The cost is not a count: the Mac prices the day again on each upload, so a
  // corrected price can lower it. It comes from the row with the most tokens.
  const hasWholeDay = "excluded.tokens >= buddy_usage_days.tokens";
  return inChunks(rows, (chunk) =>
    asArchive(db, (tx) =>
      tx
        .insert(buddyUsageDays)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            buddyUsageDays.userId,
            buddyUsageDays.machineId,
            buddyUsageDays.day,
          ],
          set: {
            ...counts.set,
            costUsd: sql.raw(
              `case when ${hasWholeDay} then excluded.cost_usd else buddy_usage_days.cost_usd end`,
            ),
          },
          setWhere: sql`${counts.setWhere} or (${sql.raw(hasWholeDay)} and excluded.cost_usd <> buddy_usage_days.cost_usd)`,
        }),
    ),
  );
}

export function upsertUsageModels(db: BuddyDb, rows: readonly UsageModelRow[]) {
  return inChunks(rows, (chunk) =>
    asArchive(db, (tx) =>
      tx
        .insert(buddyUsageModels)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            buddyUsageModels.userId,
            buddyUsageModels.machineId,
            buddyUsageModels.day,
            buddyUsageModels.model,
            buddyUsageModels.rate,
          ],
          ...keepLarger(buddyUsageModels, [
            buddyUsageModels.inputTokens,
            buddyUsageModels.outputTokens,
            buddyUsageModels.cacheReadTokens,
            buddyUsageModels.cacheWrite5mTokens,
            buddyUsageModels.cacheWrite1hTokens,
            buddyUsageModels.messages,
          ]),
        }),
    ),
  );
}

/**
 * The model and the rate of a Mac's price key, which is the model id, with
 * `+` and the rate after it where the rate is not the standard one. Each key
 * gives its own pair, so one day never has two rows of one pair.
 */
function modelAndRate(priceKey: string) {
  const plus = priceKey.lastIndexOf("+");
  return plus <= 0 || plus === priceKey.length - 1
    ? { model: priceKey, rate: "" }
    : { model: priceKey.slice(0, plus), rate: priceKey.slice(plus + 1) };
}

function modelRowsOf(
  mac: { userId: string; machineId: string },
  days: MacSnapshot["days"],
): UsageModelRow[] {
  return days.flatMap((day) =>
    Object.entries(day.models ?? {}).map(
      ([
        priceKey,
        [
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWrite5mTokens,
          cacheWrite1hTokens,
          messages,
        ],
      ]): UsageModelRow => ({
        ...mac,
        day: day.day,
        ...modelAndRate(priceKey),
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWrite5mTokens,
        cacheWrite1hTokens,
        messages,
      }),
    ),
  );
}

/**
 * Copies every day of every Mac that ever connected, and the day's models
 * where the Mac sent them, from its Redis snapshot into Postgres.
 */
export async function archiveUsageDays(kv: BuddyKv, db: BuddyDb) {
  const macs = await asArchive(db, (tx) =>
    tx
      .select({ userId: machines.userId, machineId: machines.machineId })
      .from(machines),
  );
  const written = { rows: 0, modelRows: 0 };
  for (let start = 0; start < macs.length; start += SNAPSHOTS_PER_READ) {
    const chunk = macs.slice(start, start + SNAPSHOTS_PER_READ);
    const snapshots = await readSnapshots(
      kv,
      chunk.map((mac) => mac.machineId),
    );
    const dayRows = chunk.flatMap(({ userId, machineId }) =>
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
    const modelRows = chunk.flatMap((mac) =>
      modelRowsOf(mac, snapshots.get(mac.machineId)?.days ?? []),
    );
    await upsertUsageDays(db, dayRows);
    await upsertUsageModels(db, modelRows);
    written.rows += dayRows.length;
    written.modelRows += modelRows.length;
  }
  return written;
}
