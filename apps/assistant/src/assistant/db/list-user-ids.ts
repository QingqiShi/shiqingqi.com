import { sql } from "drizzle-orm";
import { z } from "zod";
import { withoutUser } from "./scope-to.ts";
import type { AssistantDb } from "./types.ts";

const resultSchema = z.object({
  rows: z.array(z.object({ id: z.string() })),
});

/**
 * Every user, oldest first, for jobs that run across all of them. Only a cron
 * or a CLI may call this. It reads the users through the database function
 * `assistant_user_ids`, as `assistant_app` with no user.
 */
export async function listUserIds(owner: AssistantDb): Promise<string[]> {
  const result = await withoutUser(owner).execute(
    sql`select id from assistant_user_ids() as id`,
  );
  return resultSchema.parse(result).rows.map((row) => row.id);
}
