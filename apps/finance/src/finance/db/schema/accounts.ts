import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, deletedAt, updatedAt, version } from "./created-at.ts";
import {
  householdId,
  householdKey,
  householdReference,
  members,
} from "./households.ts";
import { currency, minor } from "./minor.ts";

// accounts

export const accountGroups = pgTable(
  "account_groups",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    side: text("side", { enum: ["asset", "liability"] }).notNull(),
    position: integer("position").notNull().default(0),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    check(
      "account_groups_side_check",
      sql`${t.side} in ('asset', 'liability')`,
    ),
    uniqueIndex("account_groups_name_idx")
      .on(t.householdId, t.name)
      .where(sql`${t.deletedAt} is null`),
    householdKey("account_groups", t),
  ],
);

export const accountKind = pgEnum("account_kind", [
  "cash",
  "credit",
  "investment",
  "property",
  "loan",
  "receivable",
]);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    groupId: uuid("group_id").notNull(),
    ownerMemberId: uuid("owner_member_id"),
    name: text("name").notNull(),
    institution: text("institution").notNull().default(""),
    /** The institution's website domain as a Member set it. It wins over the guess. */
    institutionDomain: text("institution_domain"),
    /** The domain the server guessed from `institution`; null when there is none or no guess yet. */
    guessedInstitutionDomain: text("guessed_institution_domain"),
    /** The version of the cached icon of the account's domain; null when the server has no icon for it. */
    institutionIconVersion: text("institution_icon_version"),
    kind: accountKind("kind").notNull(),
    currency: currency("currency").notNull(),
    excludedFromNetWorth: boolean("excluded_from_net_worth")
      .notNull()
      .default(false),
    closedOn: date("closed_on", { mode: "string" }),
    position: integer("position").notNull().default(0),
    creditLimitMinor: minor("credit_limit_minor"),
    statementDay: smallint("statement_day"),
    paymentDueDay: smallint("payment_due_day"),
    defaultPaymentAccountId: uuid("default_payment_account_id"),
    isSystem: boolean("is_system").notNull().default(false),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("accounts_household_idx").on(t.householdId, t.groupId, t.position),
    uniqueIndex("accounts_system_currency_idx")
      .on(t.householdId, t.currency)
      .where(sql`${t.isSystem} and ${t.deletedAt} is null`),
    householdKey("accounts", t),
    householdReference("accounts_group_fk", t, t.groupId, accountGroups),
    householdReference("accounts_owner_member_fk", t, t.ownerMemberId, members),
    householdReference(
      "accounts_default_payment_account_fk",
      t,
      t.defaultPaymentAccountId,
      t,
    ),
  ],
);

export const valuations = pgTable(
  "valuations",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    accountId: uuid("account_id").notNull(),
    on: date("on", { mode: "string" }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    source: text("source", { enum: ["manual", "import", "bank"] })
      .notNull()
      .default("manual"),
    note: text("note").notNull().default(""),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    check(
      "valuations_source_check",
      sql`${t.source} in ('manual', 'import', 'bank')`,
    ),
    uniqueIndex("valuations_account_on_key")
      .on(t.accountId, t.on)
      .where(sql`${t.deletedAt} is null`),
    index("valuations_account_on_idx").on(t.householdId, t.accountId, t.on),
    index("valuations_version_idx").on(t.householdId, t.version),
    householdReference("valuations_account_fk", t, t.accountId, accounts),
  ],
);
