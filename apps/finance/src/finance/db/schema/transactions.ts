import { getTableColumns, sql, type InferColumnsDataTypes } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { categories, payees, tags } from "./categories.ts";
import { createdAt, deletedAt, updatedAt, version } from "./created-at.ts";
import {
  householdId,
  householdKey,
  householdReference,
  members,
} from "./households.ts";
import { minor } from "./minor.ts";

// rules

export const ruleUnit = pgEnum("rule_unit", ["week", "month", "year"]);

export const ruleNonBusinessDay = pgEnum("rule_non_business_day", [
  "stay",
  "next",
  "previous",
]);

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    unit: ruleUnit("unit").notNull(),
    interval: smallint("interval").notNull().default(1),
    dayOfMonth: smallint("day_of_month"),
    weekday: smallint("weekday"),
    monthOfYear: smallint("month_of_year"),
    nonBusinessDay: ruleNonBusinessDay("non_business_day")
      .notNull()
      .default("stay"),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }),
    nextOn: date("next_on", { mode: "string" }).notNull(),
    autoPost: boolean("auto_post").notNull().default(false),
    template: jsonb("template").notNull(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [householdKey("rules", t)],
);

// transactions

export const transactionKind = pgEnum("transaction_kind", [
  "expense",
  "income",
  "transfer",
]);

export const transactionStatus = pgEnum("transaction_status", [
  "posted",
  "expected",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    kind: transactionKind("kind").notNull(),
    status: transactionStatus("status").notNull().default("posted"),
    date: date("date", { mode: "string" }).notNull(),
    /** Retired. Only older deployments use it. A later migration removes it. */
    amountMinor: minor("amount_minor"),
    categoryId: uuid("category_id"),
    payeeId: uuid("payee_id"),
    memberId: uuid("member_id"),
    ruleId: uuid("rule_id"),
    refundOfId: uuid("refund_of_id"),
    note: text("note").notNull().default(""),
    source: text("source", { enum: ["manual", "rule", "bank", "import"] })
      .notNull()
      .default("manual"),
    needsReview: boolean("needs_review").notNull().default(false),
    labelledBy: text("labelled_by", { enum: ["member", "ai"] })
      .notNull()
      .default("member"),
    aiReason: text("ai_reason"),
    searchText: text("search_text").notNull().default(""),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    check(
      "transactions_source_check",
      sql`${t.source} in ('manual', 'rule', 'bank', 'import')`,
    ),
    check(
      "transactions_labelled_by_check",
      sql`${t.labelledBy} in ('member', 'ai')`,
    ),
    index("transactions_date_idx")
      .on(t.householdId, t.date.desc(), t.id)
      .where(sql`${t.deletedAt} is null`),
    index("transactions_month_idx")
      .on(t.householdId, t.kind, t.categoryId, t.date)
      .where(sql`${t.deletedAt} is null and ${t.status} = 'posted'`),
    index("transactions_payee_idx")
      .on(t.householdId, t.payeeId, t.date.desc())
      .where(sql`${t.deletedAt} is null`),
    index("transactions_version_idx").on(t.householdId, t.version),
    index("transactions_review_idx")
      .on(t.householdId)
      .where(sql`${t.needsReview} and ${t.deletedAt} is null`),
    householdKey("transactions", t),
    householdReference("transactions_category_fk", t, t.categoryId, categories),
    householdReference("transactions_payee_fk", t, t.payeeId, payees),
    householdReference("transactions_member_fk", t, t.memberId, members),
    householdReference("transactions_rule_fk", t, t.ruleId, rules),
    householdReference("transactions_refund_of_fk", t, t.refundOfId, t),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    transactionId: uuid("transaction_id").notNull(),
    accountId: uuid("account_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8, mode: "number" }),
    position: smallint("position").notNull().default(0),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("entries_account_date_idx").on(t.householdId, t.accountId, t.date),
    index("entries_transaction_idx").on(t.transactionId),
    index("entries_version_idx").on(t.householdId, t.version),
    householdReference(
      "entries_transaction_fk",
      t,
      t.transactionId,
      transactions,
    ).onDelete("cascade"),
    householdReference("entries_account_fk", t, t.accountId, accounts),
  ],
);

const { amountMinor: _retiredAmountMinor, ...liveTransactionColumns } =
  getTableColumns(transactions);
/** Every column of `transactions` but the retired `amount_minor`. */
export { liveTransactionColumns };

const { fxRate: _retiredFxRate, ...liveEntryColumns } =
  getTableColumns(entries);
/** Every column of `entries` but the retired `fx_rate`. */
export { liveEntryColumns };
export type LiveEntryRow = InferColumnsDataTypes<typeof liveEntryColumns>;

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    householdId: householdId(),
    version: version(),
    deletedAt: deletedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("transaction_tags_version_idx").on(t.householdId, t.version),
    householdReference(
      "transaction_tags_transaction_fk",
      t,
      t.transactionId,
      transactions,
    ).onDelete("cascade"),
    householdReference("transaction_tags_tag_fk", t, t.tagId, tags),
  ],
);
