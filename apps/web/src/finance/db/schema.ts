import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
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

/** The unique index that lets at most one user have a given Recovery email verified. */
export const VERIFIED_EMAIL_KEY = "users_verified_email_key";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    /** The Recovery email, lower-case. At most one user has a given address verified. */
    email: text("email"),
    /** Set when the user opened the verification link for `email`. Recovery mail goes only to a verified email. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex(VERIFIED_EMAIL_KEY)
      .on(t.email)
      .where(sql`${t.emailVerifiedAt} IS NOT NULL`),
  ],
);

/** One-use links that confirm a user's Recovery email. Only the token's hash is stored. */
export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The address the link went to. It verifies only while the user's email is still this one. */
    email: text("email").notNull(),
    /** The confirmed Recovery email that `email` replaces. It gets a notice when the link is opened. */
    replacesEmail: text("replaces_email"),
    tokenHash: bytea("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("email_verifications_user_idx").on(t.userId)],
);

/**
 * A six-digit code emailed with a link, that continues the flow in the
 * browser that asked for it. Only the code's hash is stored, and the
 * browser holds the row's id in a sealed cookie.
 */
export const emailCodes = pgTable("email_codes", {
  id: uuid("id").primaryKey(),
  purpose: text("purpose", { enum: ["recovery", "sign-up"] }).notNull(),
  email: text("email").notNull(),
  codeHash: bytea("code_hash").notNull(),
  /** Each check counts, right or wrong; the code ends at the limit. */
  attempts: smallint("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** One-use links that let a person who confirmed `email` create a Household and its Owner. Only the token's hash is stored. */
export const signUps = pgTable("sign_ups", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: bytea("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
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
  aiInstructions: text("ai_instructions").notNull().default(""),
  clock: minor("clock").notNull().default(0),
  createdAt: createdAt(),
});

function householdId() {
  return uuid("household_id")
    .notNull()
    .references(() => households.id);
}

type HouseholdTable = {
  householdId: AnyPgColumn;
  id: AnyPgColumn;
};

/**
 * A reference that stays inside the Household: `(household_id, column)`
 * points at the parent's `(household_id, id)`, so the database refuses a row
 * that points at another Household's row.
 */
function householdReference(
  name: string,
  table: { householdId: AnyPgColumn },
  column: AnyPgColumn,
  parent: HouseholdTable,
) {
  return foreignKey({
    name,
    columns: [table.householdId, column],
    foreignColumns: [parent.householdId, parent.id],
  });
}

/** The key that `householdReference` points at. */
function householdKey(table: string, t: HouseholdTable) {
  return unique(`${table}_household_id_id_key`).on(t.householdId, t.id);
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
    unique("members_user_key").on(t.userId),
    householdKey("members", t),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    memberId: uuid("member_id").notNull(),
    tokenHash: bytea("token_hash").notNull().unique(),
    /** Null when the operator made the invite with `finance:invite-link`. */
    createdBy: uuid("created_by").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** Set when the invite lets a Member who lost every passkey back in: the user it adds a passkey to. */
    recoveryUserId: uuid("recovery_user_id").references(() => users.id),
  },
  (t) => [householdReference("invites_member_fk", t, t.memberId, members)],
);

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
    unique("valuations_account_on_key").on(t.accountId, t.on),
    index("valuations_account_on_idx").on(t.householdId, t.accountId, t.on),
    index("valuations_version_idx").on(t.householdId, t.version),
    householdReference("valuations_account_fk", t, t.accountId, accounts),
  ],
);

// taxonomy

export const categoryKind = pgEnum("category_kind", ["expense", "income"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    parentId: uuid("parent_id"),
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
    householdKey("categories", t),
    householdReference("categories_parent_fk", t, t.parentId, t),
  ],
);

export const payees = pgTable(
  "payees",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    name: text("name").notNull(),
    note: text("note").notNull().default(""),
    defaultCategoryId: uuid("default_category_id"),
    defaultAccountId: uuid("default_account_id"),
    mergedIntoId: uuid("merged_into_id"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("payees_name_idx")
      .on(t.householdId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    householdKey("payees", t),
    householdReference(
      "payees_default_category_fk",
      t,
      t.defaultCategoryId,
      categories,
    ),
    householdReference(
      "payees_default_account_fk",
      t,
      t.defaultAccountId,
      accounts,
    ),
    householdReference("payees_merged_into_fk", t, t.mergedIntoId, t),
  ],
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
    householdKey("tags", t),
  ],
);

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
    amountMinor: minor("amount_minor").notNull(),
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
export const balanceCheckDays = pgTable(
  "balance_check_days",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    householdId: householdId(),
    accountId: uuid("account_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("balance_check_days_household_idx").on(t.householdId, t.id)],
);

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

/**
 * The website domain a model guessed for an institution name, by the
 * normalised name and the currencies the model saw with it, as the same
 * name can be a different institution in another country. `domain` is null
 * when the name is not an institution. Until `guessed_at` is set,
 * `next_attempt_at` is when a worker may ask the model again: a claim
 * pushes it forward, a failure backs it off.
 */
export const institutionDomainGuesses = pgTable(
  "institution_domain_guesses",
  {
    nameKey: text("name_key").notNull(),
    baseCurrency: text("base_currency").notNull(),
    accountCurrency: text("account_currency").notNull(),
    domain: text("domain"),
    guessedAt: timestamp("guessed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.nameKey, t.baseCurrency, t.accountCurrency] }),
  ],
);

/**
 * The website icon of a domain, a small square WebP image. `version` changes
 * with the image, so it is the ETag of the icon. `next_attempt_at` is when a
 * worker may fetch it again: a refresh after a success, a retry after a
 * failure.
 */
export const institutionIcons = pgTable("institution_icons", {
  domain: text("domain").primaryKey(),
  image: bytea("image"),
  version: text("version"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// bank

export const connections = pgTable(
  "connections",
  {
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
  },
  (t) => [householdKey("connections", t)],
);

export const bankLinks = pgTable(
  "bank_links",
  {
    id: uuid("id").primaryKey(),
    householdId: householdId(),
    connectionId: uuid("connection_id").notNull(),
    accountId: uuid("account_id").notNull().unique(),
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
    householdKey("bank_links", t),
    householdReference(
      "bank_links_connection_fk",
      t,
      t.connectionId,
      connections,
    ),
    householdReference("bank_links_account_fk", t, t.accountId, accounts),
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
    linkId: uuid("link_id").notNull(),
    providerTxId: text("provider_tx_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    currency: currency("currency").notNull(),
    merchant: text("merchant").notNull().default(""),
    description: text("description").notNull().default(""),
    raw: jsonb("raw").notNull(),
    state: bankTxState("state").notNull().default("new"),
    transactionId: uuid("transaction_id"),
    labelAttempts: smallint("label_attempts").notNull().default(0),
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
    householdReference("bank_transactions_link_fk", t, t.linkId, bankLinks),
    householdReference(
      "bank_transactions_transaction_fk",
      t,
      t.transactionId,
      transactions,
    ),
  ],
);

export const bankBalances = pgTable(
  "bank_balances",
  {
    householdId: householdId(),
    linkId: uuid("link_id").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    amountMinor: minor("amount_minor").notNull(),
    currency: currency("currency").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.linkId, t.fetchedAt] }),
    householdReference("bank_balances_link_fk", t, t.linkId, bankLinks),
  ],
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
  emailVerifications,
  emailCodes,
  signUps,
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
  tags,
  rules,
  transactions,
  entries,
  transactionTags,
  accountBalanceDays,
  balanceCheckDays,
  monthTotals,
  fxRates,
  appliedMutations,
  connections,
  bankLinks,
  bankTransactions,
  bankBalances,
  reports,
  institutionDomainGuesses,
  institutionIcons,
};
