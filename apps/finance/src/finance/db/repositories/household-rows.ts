import { and, eq, sql, type GetColumnData, type SQL } from "drizzle-orm";
import type {
  PgColumn,
  PgInsertValue,
  PgTable,
  TableConfig,
} from "drizzle-orm/pg-core";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type HouseholdTable<C extends TableConfig> = PgTable<C> & {
  householdId: PgColumn;
  version: PgColumn;
};

type HouseholdRowTable<C extends TableConfig> = HouseholdTable<C> & {
  id: PgColumn;
};

/** The `deleted_at` change for an upsert's `deleted` flag: none when it is absent. */
function softDeletePatch(deleted: boolean | undefined): {
  deletedAt?: SQL | null;
} {
  if (deleted === undefined) return {};
  return { deletedAt: deleted ? sql`now()` : null };
}

/** The row with the Household and the write's version that every insert sets. */
export function stamped<Row>(scope: WriteScope, row: Row) {
  return { ...row, householdId: scope.householdId, version: scope.version };
}

/** The reads and writes by id that every Household table with an `id` column has. */
export function householdRows<C extends TableConfig>(
  table: HouseholdRowTable<C>,
) {
  const byId = (scope: RepositoryScope, id: string) =>
    and(eq(table.householdId, scope.householdId), eq(table.id, id));
  return {
    findById: async (scope: RepositoryScope, id: string) => {
      const rows = await scope.db.select().from(table).where(byId(scope, id));
      return rows.at(0);
    },

    /** Inserts the row. False when the id is already used. */
    insert: async (
      scope: WriteScope,
      row: PgInsertValue<HouseholdRowTable<C>>,
    ) => {
      const inserted = await scope.db
        .insert(table)
        .values(row)
        .onConflictDoNothing({ target: table.id })
        .returning({ id: table.id });
      return inserted.length > 0;
    },

    patch: async (
      scope: WriteScope,
      id: string,
      fields: {
        [K in keyof HouseholdRowTable<C>["$inferInsert"]]?:
          | GetColumnData<HouseholdRowTable<C>["_"]["columns"][K]>
          | SQL
          | PgColumn;
      },
      deleted?: boolean,
    ) => {
      await scope.db
        .update(table)
        .set({
          ...fields,
          ...softDeletePatch(deleted),
          version: scope.version,
          updatedAt: sql`now()`,
        })
        .where(byId(scope, id));
    },
  };
}
