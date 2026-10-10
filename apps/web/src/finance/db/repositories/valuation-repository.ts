import { and, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { entries, transactions, valuations } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

const now = sql`now()`;

export type ValuationSource = "manual" | "import" | "bank";

export const valuationRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(valuations)
      .where(
        and(
          eq(valuations.householdId, scope.householdId),
          eq(valuations.id, id),
        ),
      );
    return rows.at(0);
  },

  /** The Valuation of an account on a day, a deleted one included. */
  async findByAccountOn(scope: RepositoryScope, accountId: string, on: string) {
    const rows = await scope.db
      .select()
      .from(valuations)
      .where(
        and(
          eq(valuations.householdId, scope.householdId),
          eq(valuations.accountId, accountId),
          eq(valuations.on, on),
        ),
      );
    return rows.at(0);
  },

  /** Inserts the Valuation. False when the id is already used. */
  async insert(
    scope: WriteScope,
    row: {
      id: string;
      accountId: string;
      on: string;
      amountMinor: number;
      note?: string;
      source?: ValuationSource;
    },
  ) {
    const inserted = await scope.db
      .insert(valuations)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: valuations.id })
      .returning({ id: valuations.id });
    return inserted.length > 0;
  },

  async patch(
    scope: WriteScope,
    id: string,
    fields: {
      amountMinor?: number;
      note?: string;
      source?: ValuationSource;
      deleted?: boolean;
    },
  ) {
    const { deleted, ...rest } = fields;
    await scope.db
      .update(valuations)
      .set({
        ...rest,
        ...(deleted === undefined ? {} : { deletedAt: deleted ? now : null }),
        version: scope.version,
        updatedAt: now,
      })
      .where(
        and(
          eq(valuations.householdId, scope.householdId),
          eq(valuations.id, id),
        ),
      );
  },

  /**
   * An account's balance at the end of `day`, from the stored Valuations and
   * posted Entries: the latest Valuation on or before `day`, plus the Entries
   * after it.
   */
  async balanceAt(scope: RepositoryScope, accountId: string, day: string) {
    const anchors = await scope.db
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
    const anchor = anchors.at(0);
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
          eq(entries.accountId, accountId),
          isNull(entries.deletedAt),
          isNull(transactions.deletedAt),
          eq(transactions.status, "posted"),
          lte(entries.date, day),
          anchor ? gt(entries.date, anchor.on) : undefined,
        ),
      );
    return (anchor?.amountMinor ?? 0) + (movements.at(0)?.total ?? 0);
  },
};
