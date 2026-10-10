import { randomUUID } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import { sessions } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

interface CreateSessionInput {
  userId: string;
  userAgent: string;
  now: Date;
}

/** Returns the raw token. Only its hash is stored. Also deletes the user's expired sessions. */
export async function createSession(
  db: FinanceDb,
  { userId, userAgent, now }: CreateSessionInput,
): Promise<string> {
  const token = generateToken();
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)));
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    refreshedAt: now,
    lastSeenAt: now,
    expiresAt: new Date(
      now.getTime() + financeSessionCookie.maxAgeSeconds * 1000,
    ),
    userAgent: userAgent.slice(0, 512),
  });
  return token;
}
