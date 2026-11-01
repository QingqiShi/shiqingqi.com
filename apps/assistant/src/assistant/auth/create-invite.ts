import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { invites } from "#src/assistant/db/schema.ts";
import type { AssistantAppDb } from "#src/assistant/db/with-user.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type CreateInviteInput =
  | { kind: "new-user"; displayName: string; now: Date }
  /** Lets a user who lost every passkey back in. Their open recovery invites end. */
  | { kind: "recovery"; userId: string; displayName: string; now: Date };

/** Returns the raw token. Only its hash is stored. */
export async function createInvite(
  db: AssistantAppDb,
  input: CreateInviteInput,
): Promise<{ token: string; expiresAt: Date }> {
  const recoveryUserId = input.kind === "recovery" ? input.userId : null;
  if (recoveryUserId !== null) {
    await db
      .delete(invites)
      .where(
        and(eq(invites.recoveryUserId, recoveryUserId), isNull(invites.usedAt)),
      );
  }
  const token = generateToken();
  const expiresAt = new Date(input.now.getTime() + INVITE_LIFETIME_MS);
  await db.insert(invites).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    displayName: input.displayName,
    recoveryUserId,
    expiresAt,
    createdAt: input.now,
  });
  return { token, expiresAt };
}
