import {
  date,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  accountBalanceDays,
  balanceDriftDays,
} from "./schema/account-balance-days.ts";
import {
  accountGroups,
  accountKind,
  accounts,
  valuations,
} from "./schema/accounts.ts";
import {
  bankBalances,
  bankLinks,
  bankTransactions,
  bankTxState,
  connections,
} from "./schema/bank-links.ts";
import { categories, categoryKind, payees, tags } from "./schema/categories.ts";
import { version } from "./schema/created-at.ts";
import { exchangeRates } from "./schema/exchange-rates.ts";
import {
  householdId,
  households,
  invites,
  memberRole,
  members,
} from "./schema/households.ts";
import {
  institutionDomainGuesses,
  institutionIcons,
} from "./schema/institution-icons.ts";
import {
  entries,
  rules,
  ruleUnit,
  transactionKind,
  transactions,
  transactionStatus,
  transactionTags,
} from "./schema/transactions.ts";
import {
  emailCodes,
  emailVerifications,
  passkeys,
  sessions,
  signUps,
  users,
} from "./schema/users.ts";

export * from "./schema/account-balance-days.ts";
export * from "./schema/accounts.ts";
export * from "./schema/bank-links.ts";
export * from "./schema/categories.ts";
export * from "./schema/exchange-rates.ts";
export {
  households,
  invites,
  memberRole,
  members,
} from "./schema/households.ts";
export * from "./schema/institution-icons.ts";
export * from "./schema/transactions.ts";
export * from "./schema/users.ts";

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
  balanceDriftDays,
  exchangeRates,
  appliedMutations,
  connections,
  bankLinks,
  bankTransactions,
  bankBalances,
  reports,
  institutionDomainGuesses,
  institutionIcons,
};
