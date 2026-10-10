import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { payeeAliases, payees, transactions } from "../schema.ts";
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

  /** The live Payee with this name, ignoring case. */
  async findLiveByName(scope: RepositoryScope, name: string) {
    const rows = await scope.db
      .select()
      .from(payees)
      .where(
        and(
          eq(payees.householdId, scope.householdId),
          sql`lower(${payees.name}) = lower(${name})`,
          isNull(payees.deletedAt),
        ),
      );
    return rows.at(0);
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

  /** Binds bank-statement strings to a Payee; an alias bound to another Payee moves. */
  async putAliases(scope: WriteScope, payeeId: string, aliases: string[]) {
    if (aliases.length === 0) return;
    await scope.db
      .insert(payeeAliases)
      .values(
        [...new Set(aliases)].map((alias) => ({
          householdId: scope.householdId,
          alias,
          payeeId,
          version: scope.version,
        })),
      )
      .onConflictDoUpdate({
        target: [payeeAliases.householdId, payeeAliases.alias],
        set: { payeeId, version: scope.version, updatedAt: now },
        setWhere: sql`${payeeAliases.payeeId} <> ${payeeId}`,
      });
  },

  /** The Categories of the Payee's latest posted Transactions, newest first. */
  async recentCategoryIds(
    scope: RepositoryScope,
    payeeId: string,
    limit: number,
  ) {
    const rows = await scope.db
      .select({ categoryId: transactions.categoryId })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.payeeId, payeeId),
          eq(transactions.status, "posted"),
          isNull(transactions.deletedAt),
          isNotNull(transactions.categoryId),
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(limit);
    return rows.flatMap((row) =>
      row.categoryId === null ? [] : [row.categoryId],
    );
  },

  async repointAliases(scope: WriteScope, fromId: string, intoId: string) {
    await scope.db
      .update(payeeAliases)
      .set({ payeeId: intoId, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(payeeAliases.householdId, scope.householdId),
          eq(payeeAliases.payeeId, fromId),
        ),
      );
  },
};
