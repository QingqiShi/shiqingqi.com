import { asc } from "drizzle-orm";
import { users } from "./schema.ts";
import type { AssistantDb } from "./types.ts";
import { asAssistantApp } from "./with-user.ts";

/** Every user, oldest first, for jobs that run across all of them. Only a cron or a CLI may call this. */
export async function listUserIds(db: AssistantDb): Promise<string[]> {
  const rows = await asAssistantApp(db, (tx) =>
    tx
      .select({ id: users.id })
      .from(users)
      .orderBy(asc(users.createdAt), asc(users.id)),
  );
  return rows.map((row) => row.id);
}
