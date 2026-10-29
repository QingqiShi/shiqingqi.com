import { and, eq } from "drizzle-orm";
import { bankKeptTransactions } from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

export const bankKeptTransactionRepository = {
  /** The ids of the Transactions a Member keeps on the link. */
  async listIds(scope: RepositoryScope, linkId: string) {
    const rows = await scope.db
      .select({ transactionId: bankKeptTransactions.transactionId })
      .from(bankKeptTransactions)
      .where(
        and(
          eq(bankKeptTransactions.householdId, scope.householdId),
          eq(bankKeptTransactions.linkId, linkId),
        ),
      );
    return rows.map((row) => row.transactionId);
  },

  async keep(scope: RepositoryScope, linkId: string, transactionId: string) {
    await scope.db
      .insert(bankKeptTransactions)
      .values({ householdId: scope.householdId, linkId, transactionId })
      .onConflictDoNothing();
  },

  async unkeep(scope: RepositoryScope, linkId: string, transactionId: string) {
    await scope.db
      .delete(bankKeptTransactions)
      .where(
        and(
          eq(bankKeptTransactions.householdId, scope.householdId),
          eq(bankKeptTransactions.linkId, linkId),
          eq(bankKeptTransactions.transactionId, transactionId),
        ),
      );
  },
};
