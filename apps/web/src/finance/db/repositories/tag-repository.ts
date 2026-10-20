import { and, eq, inArray, isNull } from "drizzle-orm";
import { tags } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewTag = Omit<
  typeof tags.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type TagPatch = Partial<Omit<NewTag, "id">> & { deleted?: boolean };

const tagRows = householdRows(tags);

export const tagRepository = {
  findById: tagRows.findById,

  /** The ids among `ids` of Tags in the Household that are not deleted. */
  async findActiveIds(scope: RepositoryScope, ids: readonly string[]) {
    if (ids.length === 0) return new Set<string>();
    const rows = await scope.db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(
          eq(tags.householdId, scope.householdId),
          inArray(tags.id, [...ids]),
          isNull(tags.deletedAt),
        ),
      );
    return new Set(rows.map((row) => row.id));
  },

  insert: (scope: WriteScope, row: NewTag) =>
    tagRows.insert(scope, stamped(scope, row)),

  patch: (scope: WriteScope, id: string, { deleted, ...fields }: TagPatch) =>
    tagRows.patch(scope, id, fields, deleted),
};
