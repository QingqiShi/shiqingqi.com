import type { z } from "zod";

/** Mutation fields that the row keeps as a timestamp. */
const FLAG_FIELDS: Partial<Record<string, string>> = {
  deleted: "deletedAt",
  archived: "archivedAt",
  paused: "pausedAt",
};

/**
 * The args of the upsert that undoes `args`: each field it sets, as `row`
 * held it before. A delete when there was no row.
 */
export function previousUpsertArgs<Args>(
  row: Readonly<Record<string, unknown>> | undefined,
  args: { id: string },
  schema: z.ZodType<Args>,
): Args | { id: string; deleted: true } {
  if (!row) return { id: args.id, deleted: true };
  const previous: Record<string, unknown> = { id: args.id };
  for (const key of Object.keys(args)) {
    if (key === "id") continue;
    const flag = FLAG_FIELDS[key];
    previous[key] = flag === undefined ? row[key] : row[flag] != null;
  }
  return schema.parse(previous);
}
