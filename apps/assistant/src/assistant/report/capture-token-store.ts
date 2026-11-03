import { randomUUID, timingSafeEqual } from "node:crypto";
import { and, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { generateToken } from "#src/assistant/auth/generate-token.ts";
import { hashToken } from "#src/assistant/auth/hash-token.ts";
import { captureTokens } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";

export const captureLimits = {
  requestsPerWindow: 60,
  windowMs: 60 * 60 * 1000,
  bodyBytes: 8 * 1024,
};

/** What a token can be used for at this moment. */
export type CaptureTokenUse =
  | { kind: "refused" }
  | { kind: "limited"; retryAfterSeconds: number }
  | { kind: "allowed"; userId: string };

const NO_HASH = new Uint8Array(32);
const tokenId = z.uuid();

function partsOf(token: string) {
  const [id, secret, ...rest] = token.split(".");
  return secret && rest.length === 0 && tokenId.safeParse(id).success
    ? { id, secret }
    : null;
}

/** Makes a token, and gives it back this one time. Only the hash of its secret is stored. */
async function create({ db, userId }: UserScope, now: Date) {
  const id = randomUUID();
  const secret = generateToken();
  await db.insert(captureTokens).values({
    id,
    userId,
    tokenHash: hashToken(secret),
    windowStartedAt: now,
    createdAt: now,
  });
  return { id, token: `${id}.${secret}`, createdAt: now };
}

function list({ db, userId }: UserScope) {
  return db
    .select({
      id: captureTokens.id,
      createdAt: captureTokens.createdAt,
      lastUsedAt: captureTokens.lastUsedAt,
    })
    .from(captureTokens)
    .where(eq(captureTokens.userId, userId))
    .orderBy(desc(captureTokens.createdAt));
}

/** Takes a token away. False when the user has no such token. */
async function revoke({ db, userId }: UserScope, id: string) {
  const revoked = await db
    .delete(captureTokens)
    .where(and(eq(captureTokens.id, id), eq(captureTokens.userId, userId)))
    .returning({ id: captureTokens.id });
  return revoked.length > 0;
}

/**
 * Checks a token and counts one use of it in one atomic update, so that requests
 * at the same time cannot pass the limit. The row is found by the id in the
 * token, and the secret is then compared in constant time. A wrong secret does
 * not count, so nobody can use up the limit of a token that they do not hold.
 */
async function spend(
  db: AssistantDb,
  token: string,
  now: Date,
): Promise<CaptureTokenUse> {
  const parts = partsOf(token);
  if (!parts) return { kind: "refused" };
  const row = (
    await db
      .select({
        tokenHash: captureTokens.tokenHash,
        windowStartedAt: captureTokens.windowStartedAt,
      })
      .from(captureTokens)
      .where(eq(captureTokens.id, parts.id))
  ).at(0);
  const secretMatches = timingSafeEqual(
    row?.tokenHash ?? NO_HASH,
    hashToken(parts.secret),
  );
  if (!row || !secretMatches) return { kind: "refused" };

  const windowOver = lte(
    captureTokens.windowStartedAt,
    new Date(now.getTime() - captureLimits.windowMs),
  );
  const spent = (
    await db
      .update(captureTokens)
      .set({
        windowStartedAt: sql`case when ${windowOver} then ${now.toISOString()}::timestamptz else ${captureTokens.windowStartedAt} end`,
        windowCount: sql`case when ${windowOver} then 1 else ${captureTokens.windowCount} + 1 end`,
        lastUsedAt: now,
      })
      .where(
        and(
          eq(captureTokens.id, parts.id),
          or(
            windowOver,
            lt(captureTokens.windowCount, captureLimits.requestsPerWindow),
          ),
        ),
      )
      .returning({ userId: captureTokens.userId })
  ).at(0);
  if (spent) return { kind: "allowed", userId: spent.userId };
  const windowEnds = row.windowStartedAt.getTime() + captureLimits.windowMs;
  return {
    kind: "limited",
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowEnds - now.getTime()) / 1000),
    ),
  };
}

export const captureTokenStore = { create, list, revoke, spend };
