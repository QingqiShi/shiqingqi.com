import { eq } from "drizzle-orm";
import { households } from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

const householdColumns = {
  id: households.id,
  name: households.name,
  baseCurrency: households.baseCurrency,
  timezone: households.timezone,
  clock: households.clock,
};

export const householdRepository = {
  async find(scope: RepositoryScope) {
    const rows = await scope.db
      .select(householdColumns)
      .from(households)
      .where(eq(households.id, scope.householdId));
    return rows.at(0);
  },

  /** Locks the Household row until the transaction ends, so writers to one Household run one at a time. */
  async lockForWrite(scope: RepositoryScope) {
    const rows = await scope.db
      .select(householdColumns)
      .from(households)
      .where(eq(households.id, scope.householdId))
      .for("update");
    return rows.at(0);
  },

  /** Renames the Household or moves it to another timezone. */
  async update(
    scope: RepositoryScope,
    fields: { name?: string; timezone?: string },
  ) {
    if (fields.name === undefined && fields.timezone === undefined) return;
    await scope.db
      .update(households)
      .set(fields)
      .where(eq(households.id, scope.householdId));
  },

  async setClock(scope: RepositoryScope, clock: number) {
    await scope.db
      .update(households)
      .set({ clock })
      .where(eq(households.id, scope.householdId));
  },
};
