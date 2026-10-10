import { and, eq, isNull, sql } from "drizzle-orm";
import { categories, transactions } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewCategory = Omit<
  typeof categories.$inferInsert,
  | "householdId"
  | "version"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "archivedAt"
>;
type CategoryPatch = Partial<Omit<NewCategory, "id">> & {
  archived?: boolean;
  deleted?: boolean;
};

export const categoryRepository = {
  /** True when a live Transaction or a live child Category uses the Category. */
  async isInUse(scope: RepositoryScope, id: string) {
    const transaction = await scope.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.categoryId, id),
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1);
    if (transaction.length > 0) return true;
    const child = await scope.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, scope.householdId),
          eq(categories.parentId, id),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    return child.length > 0;
  },

  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.householdId, scope.householdId),
          eq(categories.id, id),
        ),
      );
    return rows.at(0);
  },

  /** The Household's live "Uncategorised" Category of `kind`. */
  async findSystem(scope: RepositoryScope, kind: "expense" | "income") {
    const rows = await scope.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, scope.householdId),
          eq(categories.isSystem, true),
          eq(categories.kind, kind),
          isNull(categories.deletedAt),
        ),
      );
    return rows.at(0)?.id;
  },

  /** Inserts the Category. False when the id is already used. */
  async insert(scope: WriteScope, row: NewCategory) {
    const inserted = await scope.db
      .insert(categories)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: categories.id })
      .returning({ id: categories.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: CategoryPatch) {
    const { archived, deleted, ...fields } = patch;
    await scope.db
      .update(categories)
      .set({
        ...fields,
        ...(archived === undefined
          ? {}
          : { archivedAt: archived ? sql`now()` : null }),
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(categories.householdId, scope.householdId),
          eq(categories.id, id),
        ),
      );
  },
};
