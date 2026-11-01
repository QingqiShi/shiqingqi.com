import { randomUUID } from "node:crypto";
import { users, userSettings } from "../db/schema.ts";
import type { AssistantDb } from "../db/types.ts";
import { asAssistantApp, withUser } from "../db/with-user.ts";

const DEV_USER_NAME = "Dev user";

/** Adds the one user that `assistant:session` signs in as, when the database has no user. Returns its id, or null when a user exists. */
export async function seedDevUser(db: AssistantDb): Promise<string | null> {
  const count = await asAssistantApp(db, (tx) => tx.$count(users));
  if (count > 0) return null;
  const userId = randomUUID();
  await withUser(db, userId, async (scope) => {
    await scope.db
      .insert(users)
      .values({ id: userId, displayName: DEV_USER_NAME });
    await scope.db.insert(userSettings).values({ userId });
  });
  return userId;
}
