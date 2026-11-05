import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { categories } from "./categories.ts";
import { createdAt, deletedAt, version } from "./created-at.ts";
import { householdId, householdReference } from "./households.ts";
import { minor, NIL_UUID } from "./minor.ts";
import { transactionKind } from "./transactions.ts";

// derived, server-maintained, synced

export const accountBalanceDays = pgTable(
  "account_balance_days",
  {
    householdId: householdId(),
    accountId: uuid("account_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    balanceMinor: minor("balance_minor").notNull(),
    version: version(),
    deletedAt: deletedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.day] }),
    index("abd_household_version_idx").on(t.householdId, t.version),
    householdReference(
      "account_balance_days_account_fk",
      t,
      t.accountId,
      accounts,
    ),
  ],
);

/**
 * The account days whose stored balance a write may have changed, filled by
 * triggers on `entries`, `transactions`, `valuations` and
 * `account_balance_days`. The daily balance repair checks each one and
 * deletes it. Server-only, never synced.
 */
export const balanceDriftDays = pgTable(
  "balance_drift_days",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    householdId: householdId(),
    accountId: uuid("account_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("balance_drift_days_household_idx").on(t.householdId, t.id)],
);

/** Retired. Only older deployments use it. A later migration removes it. */
export const monthTotals = pgTable(
  "month_totals",
  {
    householdId: householdId(),
    month: date("month", { mode: "string" }).notNull(),
    kind: transactionKind("kind").notNull(),
    categoryId: uuid("category_id").notNull(),
    memberId: uuid("member_id"),
    amountMinor: minor("amount_minor").notNull(),
    count: integer("count").notNull(),
    version: version(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("month_totals_key").on(
      t.householdId,
      t.month,
      t.kind,
      t.categoryId,
      sql`coalesce(${t.memberId}, ${NIL_UUID})`,
    ),
    index("month_totals_version_idx").on(t.householdId, t.version),
    householdReference("month_totals_category_fk", t, t.categoryId, categories),
  ],
);
