import { and, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { members } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

const memberRows = householdRows(members);

export const memberRepository = {
  findById: memberRows.findById,

  /** Inserts a Member without a user. False when the id is already used. */
  insert: (scope: WriteScope, row: { id: string; name: string }) =>
    memberRows.insert(scope, stamped(scope, { ...row, role: "member" })),

  /** `id` when it names a Member of the Household who is not removed, else null. */
  async activeIdOrNull(scope: RepositoryScope, id: string | null | undefined) {
    if (!id) return null;
    const member = await memberRepository.findById(scope, id);
    return member && !member.deletedAt ? id : null;
  },

  async countActiveOwners(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ value: count() })
      .from(members)
      .where(
        and(
          eq(members.householdId, scope.householdId),
          eq(members.role, "owner"),
          isNull(members.deletedAt),
        ),
      );
    return rows.at(0)?.value ?? 0;
  },

  /** Soft-deletes the Member and unbinds its user, so that no session or invite can resolve to it. */
  async remove(scope: WriteScope, id: string) {
    await scope.db
      .update(members)
      .set({
        userId: null,
        deletedAt: sql`now()`,
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(members.householdId, scope.householdId),
          eq(members.id, id),
          isNull(members.deletedAt),
        ),
      );
  },

  /** Brings a removed Member back without a user: they sign in again only through a new invite. */
  async restore(scope: WriteScope, id: string) {
    await scope.db
      .update(members)
      .set({ deletedAt: null, version: scope.version, updatedAt: sql`now()` })
      .where(
        and(
          eq(members.householdId, scope.householdId),
          eq(members.id, id),
          isNotNull(members.deletedAt),
        ),
      );
  },

  rename: (scope: WriteScope, id: string, name: string) =>
    memberRows.patch(scope, id, { name }),
};
