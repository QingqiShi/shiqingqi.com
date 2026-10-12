import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { payeeNameKey } from "../../domain/payees/payee-name-key.ts";
import { payees } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewPayee = Omit<
  typeof payees.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type PayeePatch = Partial<Omit<NewPayee, "id">> & { deleted?: boolean };

const now = sql`now()`;

export const payeeRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(payees)
      .where(and(eq(payees.householdId, scope.householdId), eq(payees.id, id)));
    return rows.at(0);
  },

  /**
   * The live Payee with the same name as `name` by `payeeNameKey`: case,
   * spaces, punctuation, accents and "&" for "and" do not count. An exact
   * match comes first, then the oldest.
   */
  async findLiveByName(scope: RepositoryScope, name: string) {
    const key = payeeNameKey(name);
    if (key === "") return undefined;
    const rows = await scope.db
      .select({ id: payees.id, name: payees.name })
      .from(payees)
      .where(
        and(
          eq(payees.householdId, scope.householdId),
          isNull(payees.deletedAt),
        ),
      )
      .orderBy(asc(payees.createdAt), asc(payees.id));
    const same = rows.filter((row) => payeeNameKey(row.name) === key);
    return same.find((row) => row.name === name) ?? same.at(0);
  },

  /** Inserts the Payee. False when the id is already used. */
  async insert(scope: WriteScope, row: NewPayee) {
    const inserted = await scope.db
      .insert(payees)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: payees.id })
      .returning({ id: payees.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: PayeePatch) {
    const { deleted, ...fields } = patch;
    await scope.db
      .update(payees)
      .set({
        ...fields,
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: now,
      })
      .where(and(eq(payees.householdId, scope.householdId), eq(payees.id, id)));
  },
};
