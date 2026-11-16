import { randomUUID } from "node:crypto";
import { generateToken } from "@tuja/server-auth/generate-token";
import { hashToken } from "@tuja/server-auth/hash-token";
import { and, eq, isNull } from "drizzle-orm";
import type { RepositoryScope } from "#src/finance/db/repositories/types.ts";
import { invites, members } from "#src/finance/db/schema.ts";
import { financeAuthStore } from "./finance-auth-store.ts";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

interface CreateInviteInput {
  memberId: string;
  /** Null when the operator makes the invite with `finance:invite-link`. */
  createdBy: string | null;
  /** The owner may make a recovery link for a Member who has a user already, to let them back in after they lost every passkey. */
  allowRecovery: boolean;
  now: Date;
}

type CreateInviteResult =
  | {
      ok: true;
      token: string;
      /** The path of the link's page, without a locale. */
      path: string;
      expiresAt: Date;
      recovery: boolean;
    }
  | {
      ok: false;
      reason: "member_not_found" | "member_claimed" | "owner_only";
    };

/**
 * Makes the link for a Member: an invite, which a signed-in user accepts,
 * for a Member who has no user, and a recovery link, which replaces the
 * passkeys, for a Member who has one.
 */
export async function createInvite(
  { db, householdId }: RepositoryScope,
  { memberId, createdBy, allowRecovery, now }: CreateInviteInput,
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
  if (member.userId !== null && member.userId === createdBy) {
    return { ok: false, reason: "member_claimed" };
  }
  if (member.userId !== null && !allowRecovery) {
    return { ok: false, reason: "owner_only" };
  }

  if (member.userId !== null) {
    const recovery = await financeAuthStore.startRecovery(db, {
      userId: member.userId,
      now,
      emailed: false,
      replace: true,
      lifetimeMs: INVITE_LIFETIME_MS,
    });
    return {
      ok: true,
      ...recovery,
      path: `/recover/${recovery.token}`,
      recovery: true,
    };
  }

  const token = generateToken();
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_MS);
  await db
    .delete(invites)
    .where(
      and(
        eq(invites.householdId, householdId),
        eq(invites.memberId, memberId),
        isNull(invites.usedAt),
      ),
    );
  await db.insert(invites).values({
    id: randomUUID(),
    householdId,
    memberId,
    tokenHash: hashToken(token),
    createdBy,
    expiresAt,
  });
  return {
    ok: true,
    token,
    path: `/invite/${token}`,
    expiresAt,
    recovery: false,
  };
}
