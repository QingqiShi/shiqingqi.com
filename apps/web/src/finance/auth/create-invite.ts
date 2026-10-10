import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { invites, members } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateInviteInput {
  householdId: string;
  memberId: string;
  createdBy: string;
  /** The owner may invite a Member who has a user already, to let them back in after they lost every passkey. */
  allowRecovery: boolean;
  now: Date;
}

type CreateInviteResult =
  | { ok: true; token: string; expiresAt: Date; recovery: boolean }
  | {
      ok: false;
      reason: "member_not_found" | "member_claimed" | "owner_only";
    };

export async function createInvite(
  db: FinanceDb,
  { householdId, memberId, createdBy, allowRecovery, now }: CreateInviteInput,
): Promise<CreateInviteResult> {
  const member = (
    await db
      .select({ userId: members.userId })
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.householdId, householdId),
          isNull(members.deletedAt),
        ),
      )
      .limit(1)
  ).at(0);
  if (!member) return { ok: false, reason: "member_not_found" };
  if (member.userId === createdBy) {
    return { ok: false, reason: "member_claimed" };
  }
  if (member.userId !== null && !allowRecovery) {
    return { ok: false, reason: "owner_only" };
  }

  const token = generateToken();
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_MS);
  await db.transaction(async (tx) => {
    await tx
      .delete(invites)
      .where(and(eq(invites.memberId, memberId), isNull(invites.usedAt)));
    await tx.insert(invites).values({
      id: randomUUID(),
      householdId,
      memberId,
      tokenHash: hashToken(token),
      createdBy,
      expiresAt,
      recoveryUserId: member.userId,
    });
  });
  return { ok: true, token, expiresAt, recovery: member.userId !== null };
}
