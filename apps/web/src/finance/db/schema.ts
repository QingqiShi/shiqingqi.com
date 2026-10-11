import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

const NIL_UUID = sql`'00000000-0000-0000-0000-000000000000'::uuid`;

function minor(name: string) {
  return bigint(name, { mode: "number" });
}

function currency(name: string) {
  return char(name, { length: 3 });
}

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

function updatedAt() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
}

function deletedAt() {
  return timestamp("deleted_at", { withTimezone: true });
}

function version() {
  return minor("version").notNull();
}

// identity and tenancy

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
});

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicKey: bytea("public_key").notNull(),
    counter: minor("counter").notNull().default(0),
    transports: text("transports")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    deviceName: text("device_name").notNull().default(""),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("passkeys_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull().unique(),
    createdAt: createdAt(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const households = pgTable("households", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  baseCurrency: currency("base_currency").notNull().default("GBP"),
  timezone: text("timezone").notNull().default(DEFAULT_HOUSEHOLD_TIME_ZONE),
  clock: minor("clock").notNull().default(0),
  createdAt: createdAt(),
});

function householdId() {
  return uuid("household_id")
    .notNull()
    .references(() => households.id);
}

export const memberRole = pgEnum("member_role", ["owner", "member"]);

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    role: memberRole("role").notNull().default("member"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("members_household_idx").on(t.householdId),
    unique("members_household_user_key").on(t.householdId, t.userId),
  ],
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey(),
  householdId: householdId(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id),
  tokenHash: bytea("token_hash").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  /** Set when the invite lets a Member who lost every passkey back in: the user it adds a passkey to. */
  recoveryUserId: uuid("recovery_user_id").references(() => users.id),
});

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
    groupId: uuid("group_id")
      .notNull()
      .references(() => accountGroups.id),
    ownerMemberId: uuid("owner_member_id").references(() => members.id),
    name: text("name").notNull(),
    institution: text("institution").notNull().default(""),
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
    defaultPaymentAccountId: uuid("default_payment_account_id").references(
      (): AnyPgColumn => accounts.id,
    ),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("accounts_household_idx").on(t.householdId, t.groupId, t.position),
  ],
);

export const valuations = pgTable(
  "valuations",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
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
    unique("valuations_account_on_key").on(t.accountId, t.on),
    index("valuations_account_on_idx").on(t.householdId, t.accountId, t.on),
    index("valuations_version_idx").on(t.householdId, t.version),
  ],
);

// taxonomy

export const categoryKind = pgEnum("category_kind", ["expense", "income"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
    kind: categoryKind("kind").notNull(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default(""),
    color: text("color").notNull().default(""),
    position: integer("position").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("categories_name_idx")
      .on(
        t.householdId,
        t.kind,
        sql`coalesce(${t.parentId}, ${NIL_UUID})`,
        t.name,
      )
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const payees = pgTable(
  "payees",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    note: text("note").notNull().default(""),
    defaultCategoryId: uuid("default_category_id").references(
      () => categories.id,
    ),
    defaultAccountId: uuid("default_account_id").references(() => accounts.id),
    mergedIntoId: uuid("merged_into_id").references(
      (): AnyPgColumn => payees.id,
    ),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("payees_name_idx")
      .on(t.householdId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const payeeAliases = pgTable(
  "payee_aliases",
  {
    householdId: householdId(),
    alias: text("alias").notNull(),
    payeeId: uuid("payee_id")
      .notNull()
      .references(() => payees.id),
    version: version(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.alias] })],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("tags_name_idx")
      .on(t.householdId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
  ],
);

// rules

export const ruleUnit = pgEnum("rule_unit", ["week", "month", "year"]);

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey(),
  householdId: householdId(),
  name: text("name").notNull(),
  unit: ruleUnit("unit").notNull(),
  interval: smallint("interval").notNull().default(1),
  dayOfMonth: smallint("day_of_month"),
  weekday: smallint("weekday"),
  monthOfYear: smallint("month_of_year"),
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
});

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
    amountMinor: minor("amount_minor").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    payeeId: uuid("payee_id").references(() => payees.id),
    memberId: uuid("member_id").references(() => members.id),
    ruleId: uuid("rule_id").references(() => rules.id),
    refundOfId: uuid("refund_of_id").references(
      (): AnyPgColumn => transactions.id,
    ),
    note: text("note").notNull().default(""),
    source: text("source", { enum: ["manual", "rule", "bank", "import"] })
      .notNull()
      .default("manual"),
    needsReview: boolean("needs_review").notNull().default(false),
    aiConfidence: real("ai_confidence"),
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
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
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
  ],
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    householdId: householdId(),
    version: version(),
    deletedAt: deletedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("transaction_tags_version_idx").on(t.householdId, t.version),
  ],
);

// derived, server-maintained, synced

export const accountBalanceDays = pgTable(
  "account_balance_days",
  {
    householdId: householdId(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    day: date("day", { mode: "string" }).notNull(),
    balanceMinor: minor("balance_minor").notNull(),
    version: version(),
    deletedAt: deletedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.day] }),
    index("abd_household_version_idx").on(t.householdId, t.version),
  ],
);

export const monthTotals = pgTable(
  "month_totals",
  {
    householdId: householdId(),
    month: date("month", { mode: "string" }).notNull(),
    kind: transactionKind("kind").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
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
  ],
);

// fx

export const fxRates = pgTable(
  "fx_rates",
  {
    householdId: householdId(),
    base: currency("base").notNull(),
    quote: currency("quote").notNull(),
    on: date("on", { mode: "string" }).notNull(),
    rate: numeric("rate", {
      precision: 18,
      scale: 8,
      mode: "number",
    }).notNull(),
    source: text("source").notNull().default("manual"),
    version: version(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.base, t.quote, t.on] })],
);

// sync

export const appliedMutations = pgTable(
  "applied_mutations",
  {
    householdId: householdId(),
    clientId: uuid("client_id").notNull(),
    mutationId: uuid("mutation_id").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.clientId, t.mutationId] })],
);

// bank

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey(),
  householdId: householdId(),
  provider: text("provider").notNull().default("lunchflow"),
  label: text("label").notNull(),
  /** The provider API key, sealed with `FINANCE_CREDENTIAL_KEY`; null when the owner has not set one. */
  credential: bytea("credential"),
  credentialLastFour: text("credential_last_four"),
  credentialSavedAt: timestamp("credential_saved_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  version: version(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const bankLinks = pgTable(
  "bank_links",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id),
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => accounts.id),
    providerAccountId: text("provider_account_id").notNull(),
    providerName: text("provider_name").notNull().default(""),
    providerInstitution: text("provider_institution").notNull().default(""),
    currency: currency("currency").notNull(),
    signMultiplier: smallint("sign_multiplier").notNull().default(1),
    lastSyncedOn: date("last_synced_on", { mode: "string" }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    status: text("status").notNull().default("active"),
    bankBalanceMinor: minor("bank_balance_minor"),
    bankBalanceOn: date("bank_balance_on", { mode: "string" }),
    balanceDifferenceMinor: minor("balance_difference_minor"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    unique("bank_links_provider_account_key").on(
      t.connectionId,
      t.providerAccountId,
    ),
  ],
);

export const bankTxState = pgEnum("bank_tx_state", [
  "new",
  "matched",
  "missing",
  "ignored",
]);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => bankLinks.id),
    providerTxId: text("provider_tx_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    currency: currency("currency").notNull(),
    merchant: text("merchant").notNull().default(""),
    description: text("description").notNull().default(""),
    raw: jsonb("raw").notNull(),
    state: bankTxState("state").notNull().default("new"),
    transactionId: uuid("transaction_id").references(() => transactions.id),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: version(),
  },
  (t) => [
    unique("bank_transactions_provider_tx_key").on(t.linkId, t.providerTxId),
  ],
);

export const bankBalances = pgTable(
  "bank_balances",
  {
    householdId: householdId(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => bankLinks.id),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    currency: currency("currency").notNull(),
  },
  (t) => [primaryKey({ columns: [t.linkId, t.fetchedAt] })],
);

// reports

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    data: jsonb("data").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: version(),
  },
  (t) => [unique("reports_period_end_key").on(t.householdId, t.periodEnd)],
);

export const schema = {
  memberRole,
  accountKind,
  categoryKind,
  ruleUnit,
  transactionKind,
  transactionStatus,
  bankTxState,
  users,
  passkeys,
  sessions,
  households,
  members,
  invites,
  accountGroups,
  accounts,
  valuations,
  categories,
  payees,
  payeeAliases,
  tags,
  rules,
  transactions,
  entries,
  transactionTags,
  accountBalanceDays,
  monthTotals,
  fxRates,
  appliedMutations,
  connections,
  bankLinks,
  bankTransactions,
  bankBalances,
  reports,
};
