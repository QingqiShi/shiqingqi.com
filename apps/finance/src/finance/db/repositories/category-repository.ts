import { and, eq, isNull, sql } from "drizzle-orm";
import { categories, transactions } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
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

const categoryRows = householdRows(categories);

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

  findById: categoryRows.findById,

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

  insert: (scope: WriteScope, row: NewCategory) =>
    categoryRows.insert(scope, stamped(scope, row)),

  patch: (
    scope: WriteScope,
    id: string,
    { archived, deleted, ...fields }: CategoryPatch,
  ) =>
    categoryRows.patch(
      scope,
      id,
      {
        ...fields,
        ...(archived === undefined
          ? {}
          : { archivedAt: archived ? sql`now()` : null }),
      },
      deleted,
    ),
};
