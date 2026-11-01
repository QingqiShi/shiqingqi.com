import { randomUUID } from "node:crypto";
import { users, userSettings } from "../db/schema.ts";
import type { AssistantDb } from "../db/types.ts";

const DEV_USER_NAME = "Dev user";

/** Adds the one user that `assistant:session` signs in as, when the database has no user. Returns its id, or null when a user exists. */
export async function seedDevUser(db: AssistantDb): Promise<string | null> {
  const count = await db.$count(users);
  if (count > 0) return null;
  const userId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ id: userId, displayName: DEV_USER_NAME });
    await tx.insert(userSettings).values({ userId });
  });
  return userId;
}
