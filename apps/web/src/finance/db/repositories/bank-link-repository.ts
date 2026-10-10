import { and, eq, isNull, sql } from "drizzle-orm";
import { bankBalances, bankLinks, connections } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type BankLinkRecord = typeof bankLinks.$inferSelect;
type NewBankLink = Omit<
  typeof bankLinks.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt"
>;
type BankLinkPatch = Partial<Omit<NewBankLink, "id">>;

const now = sql`now()`;

export const bankLinkRepository = {
  /** The Household's live Bank links. */
  async listLive(scope: RepositoryScope) {
    return scope.db
      .select()
      .from(bankLinks)
      .where(
        and(
          eq(bankLinks.householdId, scope.householdId),
          isNull(bankLinks.deletedAt),
        ),
      )
      .orderBy(bankLinks.createdAt);
  },

  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(bankLinks)
      .where(
        and(eq(bankLinks.householdId, scope.householdId), eq(bankLinks.id, id)),
      );
    return rows.at(0);
  },

  /** The link of an account, a removed one too: an account has at most one row. */
  async findByAccountId(scope: RepositoryScope, accountId: string) {
    const rows = await scope.db
      .select()
      .from(bankLinks)
      .where(
        and(
          eq(bankLinks.householdId, scope.householdId),
          eq(bankLinks.accountId, accountId),
        ),
      );
    return rows.at(0);
  },

  async findByProviderAccount(
    scope: RepositoryScope,
    connectionId: string,
    providerAccountId: string,
  ) {
    const rows = await scope.db
      .select()
      .from(bankLinks)
      .where(
        and(
          eq(bankLinks.householdId, scope.householdId),
          eq(bankLinks.connectionId, connectionId),
          eq(bankLinks.providerAccountId, providerAccountId),
        ),
      );
    return rows.at(0);
  },

  async insert(scope: WriteScope, row: NewBankLink) {
    await scope.db.insert(bankLinks).values({
      ...row,
      householdId: scope.householdId,
      version: scope.version,
    });
  },

  async patch(scope: WriteScope, id: string, fields: BankLinkPatch) {
    await scope.db
      .update(bankLinks)
      .set({ ...fields, version: scope.version, updatedAt: now })
      .where(
        and(eq(bankLinks.householdId, scope.householdId), eq(bankLinks.id, id)),
      );
  },

  async recordBalance(
    scope: RepositoryScope,
    balance: {
      linkId: string;
      fetchedAt: Date;
      amountMinor: number;
      currency: string;
    },
  ) {
    await scope.db
      .insert(bankBalances)
      .values({ ...balance, householdId: scope.householdId })
      .onConflictDoNothing();
  },

  /** The Household's Lunch Flow Connection, created on first use. */
  async ensureConnection(scope: WriteScope, id: string) {
    const rows = await scope.db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.householdId, scope.householdId),
          eq(connections.provider, "lunchflow"),
          isNull(connections.deletedAt),
        ),
      );
    const existing = rows.at(0);
    if (existing) return existing.id;
    await scope.db.insert(connections).values({
      id,
      householdId: scope.householdId,
      provider: "lunchflow",
      label: "Lunch Flow",
      version: scope.version,
    });
    return id;
  },

  async findConnectionId(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.householdId, scope.householdId),
          eq(connections.provider, "lunchflow"),
          isNull(connections.deletedAt),
        ),
      );
    return rows.at(0)?.id;
  },
};
