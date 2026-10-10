import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { tags } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewTag = Omit<
  typeof tags.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type TagPatch = Partial<Omit<NewTag, "id">> & { deleted?: boolean };

export const tagRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(tags)
      .where(and(eq(tags.householdId, scope.householdId), eq(tags.id, id)));
    return rows.at(0);
  },

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

  /** Inserts the Tag. False when the id is already used. */
  async insert(scope: WriteScope, row: NewTag) {
    const inserted = await scope.db
      .insert(tags)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: tags.id })
      .returning({ id: tags.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: TagPatch) {
    const { deleted, ...fields } = patch;
    await scope.db
      .update(tags)
      .set({
        ...fields,
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(and(eq(tags.householdId, scope.householdId), eq(tags.id, id)));
  },
};
