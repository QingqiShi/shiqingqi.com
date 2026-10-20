import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { accountGroups } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewAccountGroup = Omit<
  typeof accountGroups.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type AccountGroupPatch = Partial<Omit<NewAccountGroup, "id">> & {
  deleted?: boolean;
};

const accountGroupRows = householdRows(accountGroups);

export const accountGroupRepository = {
  findById: accountGroupRows.findById,

  /** The live asset Group that comes first in position order. */
  async findFirstAsset(scope: RepositoryScope) {
    const rows = await scope.db
      .select()
      .from(accountGroups)
      .where(
        and(
          eq(accountGroups.householdId, scope.householdId),
          eq(accountGroups.side, "asset"),
          isNull(accountGroups.deletedAt),
        ),
      )
      .orderBy(asc(accountGroups.position), asc(accountGroups.name))
      .limit(1);
    return rows.at(0);
  },

  /** The position after the last live Group. */
  async nextPosition(scope: RepositoryScope) {
    const rows = await scope.db
      .select({
        next: sql<number>`coalesce(max(${accountGroups.position}) + 1, 0)`,
      })
      .from(accountGroups)
      .where(
        and(
          eq(accountGroups.householdId, scope.householdId),
          isNull(accountGroups.deletedAt),
        ),
      );
    return rows.at(0)?.next ?? 0;
  },

  insert: (scope: WriteScope, row: NewAccountGroup) =>
    accountGroupRows.insert(scope, stamped(scope, row)),

  patch: (
    scope: WriteScope,
    id: string,
    { deleted, ...fields }: AccountGroupPatch,
  ) => accountGroupRows.patch(scope, id, fields, deleted),
};
