import { randomUUID, timingSafeEqual } from "node:crypto";
import { generateToken } from "@tuja/server-auth/generate-token";
import { hashToken } from "@tuja/server-auth/hash-token";
import { and, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { captureTokens } from "#src/assistant/db/schema.ts";
import {
  scopeTo,
  withoutUser,
  type UserScope,
} from "#src/assistant/db/scope-to.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";

export const captureLimits = {
  requestsPerWindow: 60,
  windowMs: 60 * 60 * 1000,
  bodyBytes: 8 * 1024,
};

/** What a token can be used for at this moment. `scope` is the token's user. */
type CaptureTokenUse =
  | { kind: "refused" }
  | { kind: "limited"; retryAfterSeconds: number }
  | { kind: "allowed"; scope: UserScope };

const NO_HASH = new Uint8Array(32);
const tokenId = z.uuid();
const tokenRowSchema = z.object({
  user_id: z.guid(),
  token_hash: z.instanceof(Uint8Array),
  window_started_ms: z.number(),
});

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
 *
 * Before the user is known, only the database function
 * `assistant_capture_token` reads the row. The count runs as the token's user.
 */
async function spend(
  owner: AssistantDb,
  token: string,
  now: Date,
): Promise<CaptureTokenUse> {
  const parts = partsOf(token);
  if (!parts) return { kind: "refused" };
  const found = await withoutUser(owner).execute(
    sql`select user_id, token_hash, extract(epoch from window_started_at)::float8 * 1000 as window_started_ms from assistant_capture_token(${parts.id})`,
  );
  const row = z
    .object({ rows: z.array(tokenRowSchema) })
    .parse(found)
    .rows.at(0);
  const secretMatches = timingSafeEqual(
    row?.token_hash ?? NO_HASH,
    hashToken(parts.secret),
  );
  if (!row || !secretMatches) return { kind: "refused" };
  const scope = scopeTo(owner, row.user_id);

  const windowOver = lte(
    captureTokens.windowStartedAt,
    new Date(now.getTime() - captureLimits.windowMs),
  );
  const spent = (
    await scope.db
      .update(captureTokens)
      .set({
        windowStartedAt: sql`case when ${windowOver} then ${now.toISOString()}::timestamptz else ${captureTokens.windowStartedAt} end`,
        windowCount: sql`case when ${windowOver} then 1 else ${captureTokens.windowCount} + 1 end`,
        lastUsedAt: now,
      })
      .where(
        and(
          eq(captureTokens.id, parts.id),
          eq(captureTokens.userId, scope.userId),
          or(
            windowOver,
            lt(captureTokens.windowCount, captureLimits.requestsPerWindow),
          ),
        ),
      )
      .returning({ id: captureTokens.id })
  ).at(0);
  if (spent) return { kind: "allowed", scope };
  const windowEnds = row.window_started_ms + captureLimits.windowMs;
  return {
    kind: "limited",
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowEnds - now.getTime()) / 1000),
    ),
  };
}

export const captureTokenStore = { create, list, revoke, spend };
