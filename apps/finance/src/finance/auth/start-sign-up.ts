import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { signUps } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import {
  asFinanceApp,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const SIGN_UP_LIFETIME_MS = 30 * 60 * 1000;

interface OpenSignUp {
  signUpId: string;
  email: string;
}

/**
 * Stores a sign-up link for `email` and returns its raw token. An earlier
 * link for `email` stops working, and expired links of any address go.
 */
export async function startSignUp(
  db: FinanceAppDb,
  { email, now }: { email: string; now: Date },
): Promise<string> {
  const token = generateToken();
  await db
    .delete(signUps)
    .where(
      or(
        and(eq(signUps.email, email), isNull(signUps.usedAt)),
        lte(signUps.expiresAt, now),
      ),
    );
  await db.insert(signUps).values({
    id: randomUUID(),
    email,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SIGN_UP_LIFETIME_MS),
  });
  return token;
}

/** Null when the token is unknown, used or expired. */
export function lookupSignUp(
  db: FinanceDb,
  token: string,
  now: Date,
): Promise<OpenSignUp | null> {
  return asFinanceApp(db, async (tx) => {
    const signUp = (
      await tx
        .select({ signUpId: signUps.id, email: signUps.email })
        .from(signUps)
        .where(
          and(
            eq(signUps.tokenHash, hashToken(token)),
            isNull(signUps.usedAt),
            gt(signUps.expiresAt, now),
          ),
        )
        .limit(1)
    ).at(0);
    return signUp ?? null;
  });
}

/** Marks the sign-up used. False when it was used or expired in the meantime. */
export async function consumeSignUp(
  db: FinanceAppDb,
  { signUpId, now }: { signUpId: string; now: Date },
): Promise<boolean> {
  const used = await db
    .update(signUps)
    .set({ usedAt: now })
    .where(
      and(
        eq(signUps.id, signUpId),
        isNull(signUps.usedAt),
        gt(signUps.expiresAt, now),
      ),
    )
    .returning({ id: signUps.id });
  return used.length === 1;
}
