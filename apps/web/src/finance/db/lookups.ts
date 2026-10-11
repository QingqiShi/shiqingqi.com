import { sql } from "drizzle-orm";
import type { FinanceAppDb } from "./with-household.ts";

/**
 * The functions of the `finance_auth` schema: the lookups that run before a
 * Household is known. They run as `finance_auth`, the one role that may read
 * `households`, `members` and `invites` across Households, and the Recovery
 * emails of users. They return only what the caller needs to pick a
 * Household.
 */
export const lookups = {
  /** Every Household id, in id order. */
  async householdIds(db: FinanceAppDb) {
    const rows = await db
      .select({ id: sql<string>`ids.id` })
      .from(sql`finance_auth.household_ids() as ids(id)`);
    return rows.map((row) => row.id);
  },

  /** The live memberships of a user, oldest first. */
  membershipsOfUser(db: FinanceAppDb, userId: string) {
    return db
      .select({
        householdId: sql<string>`memberships.household_id`,
        memberId: sql<string>`memberships.member_id`,
        role: sql<"owner" | "member">`memberships.role`,
      })
      .from(sql`finance_auth.memberships_of_user(${userId}) as memberships`);
  },

  /**
   * The live Members whose user has `email` as a verified Recovery email,
   * with their Households, in Household name order.
   */
  recoveryMembers(db: FinanceAppDb, email: string) {
    return db
      .select({
        householdId: sql<string>`recovery.household_id`,
        householdName: sql<string>`recovery.household_name`,
        memberId: sql<string>`recovery.member_id`,
        userId: sql<string>`recovery.user_id`,
      })
      .from(sql`finance_auth.recovery_members(${email}) as recovery`);
  },

  /**
   * The open invite with this token hash at `now`: not used, not expired, its
   * Member live, and its Member's user the one the invite was made for (none
   * for a new-member invite).
   */
  async inviteByToken(db: FinanceAppDb, tokenHash: Uint8Array, now: Date) {
    const rows = await db
      .select({
        inviteId: sql<string>`invite.invite_id`,
        householdId: sql<string>`invite.household_id`,
        householdName: sql<string>`invite.household_name`,
        memberId: sql<string>`invite.member_id`,
        memberName: sql<string>`invite.member_name`,
        recoveryUserId: sql<string | null>`invite.recovery_user_id`,
      })
      .from(
        sql`finance_auth.invite_by_token(${tokenHash}, ${now.toISOString()}::timestamptz) as invite`,
      );
    return rows.at(0) ?? null;
  },
};
