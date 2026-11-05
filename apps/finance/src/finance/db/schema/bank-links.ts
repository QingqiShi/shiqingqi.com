import {
  boolean,
  date,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { createdAt, deletedAt, updatedAt, version } from "./created-at.ts";
import { householdId, householdKey, householdReference } from "./households.ts";
import { bytea, currency, minor } from "./minor.ts";
import { transactions } from "./transactions.ts";

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
    bankRowsWaiting: boolean("bank_rows_waiting").notNull().default(false),
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

/** The Transactions a Member keeps on a Bank link although no bank row backs them. Server-only, never synced. */
export const bankKeptTransactions = pgTable(
  "bank_kept_transactions",
  {
    householdId: householdId(),
    linkId: uuid("link_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.linkId, t.transactionId] }),
    householdReference(
      "bank_kept_transactions_link_fk",
      t,
      t.linkId,
      bankLinks,
    ),
    householdReference(
      "bank_kept_transactions_transaction_fk",
      t,
      t.transactionId,
      transactions,
    ).onDelete("cascade"),
  ],
);
