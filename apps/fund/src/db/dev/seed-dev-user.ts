import { randomUUID } from "node:crypto";
import { users } from "../schema.ts";
import type { FundDb } from "../types.ts";

/** The user that `fund:session` signs in as on a fresh local database. */
export const DEV_USER_EMAIL = "owner@fund.localhost";

/** Adds the dev user when the database has no user yet. True when it added one. */
export async function seedDevUser(db: FundDb): Promise<boolean> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return false;
  await db
    .insert(users)
    .values({ id: randomUUID(), email: DEV_USER_EMAIL })
    .onConflictDoNothing();
  return true;
}
