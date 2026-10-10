import { and, eq, sql } from "drizzle-orm";
import { accountGroups } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewAccountGroup = Omit<
  typeof accountGroups.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type AccountGroupPatch = Partial<Omit<NewAccountGroup, "id">> & {
  deleted?: boolean;
};

export const accountGroupRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(accountGroups)
      .where(
        and(
          eq(accountGroups.householdId, scope.householdId),
          eq(accountGroups.id, id),
        ),
      );
    return rows.at(0);
  },

  /** Inserts the Group. False when the id is already used. */
  async insert(scope: WriteScope, row: NewAccountGroup) {
    const inserted = await scope.db
      .insert(accountGroups)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: accountGroups.id })
      .returning({ id: accountGroups.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: AccountGroupPatch) {
    const { deleted, ...fields } = patch;
    await scope.db
      .update(accountGroups)
      .set({
        ...fields,
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(accountGroups.householdId, scope.householdId),
          eq(accountGroups.id, id),
        ),
      );
  },
};
