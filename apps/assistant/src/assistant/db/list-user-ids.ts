import { asc } from "drizzle-orm";
import { users } from "./schema.ts";
import type { AssistantDb } from "./types.ts";

/** Every user, oldest first, for jobs that run across all of them. Only a cron or a CLI may call this. */
export async function listUserIds(db: AssistantDb): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(asc(users.createdAt), asc(users.id));
  return rows.map((row) => row.id);
}
