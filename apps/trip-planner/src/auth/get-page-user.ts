import { eq } from "drizzle-orm";
import "server-only";
import { users } from "#src/db/auth-schema.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { getAuthSecret } from "./get-auth-secret.ts";
import { getPageSession } from "./get-page-session.ts";

/** The signed-in user of a page, or null. */
export async function getPageUser(): Promise<{ email: string } | null> {
  if (!getAuthSecret()) return null;
  const session = await getPageSession();
  if (!session) return null;
  const user = await getTripsDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.userId));
  return user.at(0) ?? null;
}
