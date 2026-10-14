import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { accounts, bankLinks, entries, valuations } from "../schema.ts";
import { softDeletePatch } from "./soft-delete-patch.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewAccount = Omit<
  typeof accounts.$inferInsert,
  "householdId" | "version" | "createdAt" | "updatedAt" | "deletedAt"
>;
type AccountPatch = Partial<Omit<NewAccount, "id">> & {
  deleted?: boolean;
};

export const accountRepository = {
  /** True when a live Entry, Valuation or Bank link uses the account. */
  async isInUse(scope: RepositoryScope, id: string) {
    const entry = await scope.db
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.accountId, id),
          isNull(entries.deletedAt),
        ),
      )
      .limit(1);
    if (entry.length > 0) return true;
    const valuation = await scope.db
      .select({ id: valuations.id })
      .from(valuations)
      .where(
        and(
          eq(valuations.householdId, scope.householdId),
          eq(valuations.accountId, id),
          isNull(valuations.deletedAt),
        ),
      )
      .limit(1);
    if (valuation.length > 0) return true;
    const link = await scope.db
      .select({ id: bankLinks.id })
      .from(bankLinks)
      .where(
        and(
          eq(bankLinks.householdId, scope.householdId),
          eq(bankLinks.accountId, id),
          isNull(bankLinks.deletedAt),
        ),
      )
      .limit(1);
    return link.length > 0;
  },

  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.householdId, scope.householdId), eq(accounts.id, id)),
      );
    return rows.at(0);
  },

  /** The id of the live In transit account in `currency`, if the Household has one. */
  async findSystemId(scope: RepositoryScope, currency: string) {
    const rows = await scope.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.currency, currency),
          eq(accounts.isSystem, true),
          isNull(accounts.deletedAt),
        ),
      );
    return rows.at(0)?.id;
  },

  /** The live In transit account of each currency, by currency. */
  async listSystemIds(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ id: accounts.id, currency: accounts.currency })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.isSystem, true),
          isNull(accounts.deletedAt),
        ),
      );
    return new Map(rows.map((row) => [row.currency, row.id]));
  },

  /** The position after the last account in the Group. */
  async nextPosition(scope: RepositoryScope, groupId: string) {
    const rows = await scope.db
      .select({ next: sql<number>`coalesce(max(${accounts.position}) + 1, 0)` })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.groupId, groupId),
          isNull(accounts.deletedAt),
        ),
      );
    return rows.at(0)?.next ?? 0;
  },

  /** The ids among `ids` of accounts in the Household that are not deleted. */
  async findActiveIds(scope: RepositoryScope, ids: readonly string[]) {
    if (ids.length === 0) return new Set<string>();
    const rows = await scope.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          inArray(accounts.id, [...ids]),
          isNull(accounts.deletedAt),
        ),
      );
    return new Set(rows.map((row) => row.id));
  },

  /** The kinds of the accounts in a Group that are not deleted. */
  async findKindsInGroup(scope: RepositoryScope, groupId: string) {
    const rows = await scope.db
      .selectDistinct({ kind: accounts.kind })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.groupId, groupId),
          isNull(accounts.deletedAt),
        ),
      );
    return rows.map((row) => row.kind);
  },

  /** Every account id in the Household, deleted and closed ones included. */
  async listAllIds(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.householdId, scope.householdId));
    return rows.map((row) => row.id);
  },

  /** The institution fields of every live account that is not a system account. */
  async listInstitutionFields(scope: RepositoryScope) {
    return scope.db
      .select({
        id: accounts.id,
        institution: accounts.institution,
        institutionDomain: accounts.institutionDomain,
        guessedInstitutionDomain: accounts.guessedInstitutionDomain,
        currency: accounts.currency,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.isSystem, false),
          isNull(accounts.deletedAt),
        ),
      )
      .orderBy(accounts.position, accounts.id);
  },

  /** Sets the guessed institution domain of each account in `guesses`, by account id. */
  async setGuessedInstitutionDomains(
    scope: WriteScope,
    guesses: ReadonlyMap<string, string | null>,
  ) {
    if (guesses.size === 0) return;
    const cases = sql.join(
      [...guesses].map(
        ([id, domain]) => sql`when ${accounts.id} = ${id} then ${domain}::text`,
      ),
      sql` `,
    );
    await scope.db
      .update(accounts)
      .set({
        guessedInstitutionDomain: sql`case ${cases} end`,
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          inArray(accounts.id, [...guesses.keys()]),
        ),
      );
  },

  /** Inserts the account. False when the id is already used. */
  async insert(scope: WriteScope, row: NewAccount) {
    const inserted = await scope.db
      .insert(accounts)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: accounts.id })
      .returning({ id: accounts.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, patch: AccountPatch) {
    const { deleted, ...fields } = patch;
    await scope.db
      .update(accounts)
      .set({
        ...fields,
        ...softDeletePatch(deleted),
        version: scope.version,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(accounts.householdId, scope.householdId), eq(accounts.id, id)),
      );
  },
};
