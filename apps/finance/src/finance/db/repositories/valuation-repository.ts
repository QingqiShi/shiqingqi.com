import { and, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { entries, transactions, valuations } from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type ValuationSource = "manual" | "import" | "bank";

/** The posted Entries of an account after `afterDay`, up to `day`. The caller adds the Household. */
function postedEntriesOf(
  accountId: string,
  afterDay: string | null,
  day: string,
) {
  return and(
    eq(entries.accountId, accountId),
    isNull(entries.deletedAt),
    isNull(transactions.deletedAt),
    eq(transactions.status, "posted"),
    lte(entries.date, day),
    afterDay === null ? undefined : gt(entries.date, afterDay),
  );
}

/** The latest live Valuation of an account on or before `day`. */
async function latestOnOrBefore(
  scope: RepositoryScope,
  accountId: string,
  day: string,
) {
  const rows = await scope.db
    .select({ on: valuations.on, amountMinor: valuations.amountMinor })
    .from(valuations)
    .where(
      and(
        eq(valuations.householdId, scope.householdId),
        eq(valuations.accountId, accountId),
        isNull(valuations.deletedAt),
        lte(valuations.on, day),
      ),
    )
    .orderBy(desc(valuations.on))
    .limit(1);
  return rows.at(0);
}

const valuationRows = householdRows(valuations);

export const valuationRepository = {
  findById: valuationRows.findById,

  insert: (
    scope: WriteScope,
    row: {
      id: string;
      accountId: string;
      on: string;
      amountMinor: number;
      note?: string;
      source?: ValuationSource;
    },
  ) => valuationRows.insert(scope, stamped(scope, row)),

  patch: (
    scope: WriteScope,
    id: string,
    {
      deleted,
      ...fields
    }: {
      amountMinor?: number;
      note?: string;
      source?: ValuationSource;
      deleted?: boolean;
    },
  ) => valuationRows.patch(scope, id, fields, deleted),

  latestOnOrBefore,

  /**
   * An account's balance at the end of `day`, from the stored Valuations and
   * posted Entries: the latest Valuation on or before `day`, plus the Entries
   * after it.
   */
  async balanceAt(scope: RepositoryScope, accountId: string, day: string) {
    const anchor = await latestOnOrBefore(scope, accountId, day);
    const movements = await scope.db
      .select({
        total: sql`coalesce(sum(${entries.amountMinor}), 0)::bigint`.mapWith(
          Number,
        ),
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          postedEntriesOf(accountId, anchor?.on ?? null, day),
        ),
      );
    return (anchor?.amountMinor ?? 0) + (movements.at(0)?.total ?? 0);
  },

  /** The posted Entries that `balanceAt` adds to the Valuation on `afterDay`: those after it, up to `day`. */
  async postedEntriesAfter(
    scope: RepositoryScope,
    accountId: string,
    afterDay: string | null,
    day: string,
  ) {
    return scope.db
      .select({
        id: entries.id,
        transactionId: entries.transactionId,
        date: entries.date,
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          postedEntriesOf(accountId, afterDay, day),
        ),
      );
  },
};
