import { z } from "zod";
import { ruleTemplateSchema } from "../rules/rule-template-schema.ts";
import { wireFields } from "./wire-fields.ts";

const { id, day, minorUnits, currency, timestamp, version, position } =
  wireFields;
const deletedAt = timestamp.nullable();

export const accountKindSchema = z.enum([
  "cash",
  "credit",
  "investment",
  "property",
  "loan",
  "receivable",
]);
export const transactionKindSchema = z.enum(["expense", "income", "transfer"]);
export const categoryKindSchema = z.enum(["expense", "income"]);
export const groupSideSchema = z.enum(["asset", "liability"]);
export const ruleUnitSchema = z.enum(["week", "month", "year"]);

export const householdRowSchema = z.object({
  id,
  name: z.string(),
  baseCurrency: currency,
  timezone: z.string(),
  clock: version,
});

const memberRowSchema = z.object({
  id,
  householdId: id,
  userId: id.nullable(),
  name: z.string(),
  role: z.enum(["owner", "member"]),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const accountGroupRowSchema = z.object({
  id,
  householdId: id,
  name: z.string(),
  side: groupSideSchema,
  position,
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const accountRowSchema = z.object({
  id,
  householdId: id,
  groupId: id,
  ownerMemberId: id.nullable(),
  name: z.string(),
  institution: z.string(),
  kind: accountKindSchema,
  currency,
  excludedFromNetWorth: z.boolean(),
  closedOn: day.nullable(),
  position,
  creditLimitMinor: minorUnits.nullable(),
  statementDay: z.int().nullable(),
  paymentDueDay: z.int().nullable(),
  defaultPaymentAccountId: id.nullable(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const valuationRowSchema = z.object({
  id,
  householdId: id,
  accountId: id,
  on: day,
  amountMinor: minorUnits,
  source: z.enum(["manual", "import", "bank"]),
  note: z.string(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const categoryRowSchema = z.object({
  id,
  householdId: id,
  parentId: id.nullable(),
  kind: categoryKindSchema,
  name: z.string(),
  emoji: z.string(),
  color: z.string(),
  position,
  isSystem: z.boolean(),
  archivedAt: timestamp.nullable(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const payeeRowSchema = z.object({
  id,
  householdId: id,
  name: z.string(),
  note: z.string(),
  defaultCategoryId: id.nullable(),
  defaultAccountId: id.nullable(),
  mergedIntoId: id.nullable(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const payeeAliasRowSchema = z.object({
  householdId: id,
  alias: z.string(),
  payeeId: id,
  version,
  updatedAt: timestamp,
});

const tagRowSchema = z.object({
  id,
  householdId: id,
  name: z.string(),
  position,
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const ruleRowSchema = z.object({
  id,
  householdId: id,
  name: z.string(),
  unit: ruleUnitSchema,
  interval: z.int(),
  dayOfMonth: z.int().nullable(),
  weekday: z.int().nullable(),
  monthOfYear: z.int().nullable(),
  startsOn: day,
  endsOn: day.nullable(),
  nextOn: day,
  autoPost: z.boolean(),
  template: ruleTemplateSchema,
  pausedAt: timestamp.nullable(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const transactionRowSchema = z.object({
  id,
  householdId: id,
  kind: transactionKindSchema,
  status: z.enum(["posted", "expected"]),
  date: day,
  amountMinor: minorUnits,
  categoryId: id.nullable(),
  payeeId: id.nullable(),
  memberId: id.nullable(),
  ruleId: id.nullable(),
  refundOfId: id.nullable(),
  note: z.string(),
  source: z.enum(["manual", "rule", "bank", "import"]),
  needsReview: z.boolean(),
  aiConfidence: z.number().nullable(),
  searchText: z.string(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const entryRowSchema = z.object({
  id,
  householdId: id,
  transactionId: id,
  accountId: id,
  date: day,
  amountMinor: minorUnits,
  fxRate: z.number().nullable(),
  position: z.int(),
  version,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt,
});

const transactionTagRowSchema = z.object({
  transactionId: id,
  tagId: id,
  householdId: id,
  version,
  deletedAt,
});

const accountBalanceDayRowSchema = z.object({
  householdId: id,
  accountId: id,
  day,
  balanceMinor: minorUnits,
  version,
  deletedAt,
});

const monthTotalRowSchema = z.object({
  householdId: id,
  month: day,
  kind: transactionKindSchema,
  categoryId: id,
  memberId: id.nullable(),
  amountMinor: minorUnits,
  count: z.int(),
  version,
  deletedAt,
});

const fxRateRowSchema = z.object({
  householdId: id,
  base: currency,
  quote: currency,
  on: day,
  rate: z.number().positive(),
  source: z.string(),
  version,
});

/** The status fields of a Bank link; the provider credential never leaves the server. */
const bankLinkRowSchema = z.object({
  id,
  householdId: id,
  accountId: id,
  providerName: z.string(),
  providerInstitution: z.string(),
  currency,
  lastSyncedOn: day.nullable(),
  lastSyncAt: timestamp.nullable(),
  lastError: z.string().nullable(),
  status: z.string(),
  /** What the bank said the balance was at the end of `bankBalanceOn`. */
  bankBalanceMinor: minorUnits.nullable(),
  bankBalanceOn: day.nullable(),
  /** The bank balance minus ours on `bankBalanceOn`; null when they agree or the difference is dismissed. */
  balanceDifferenceMinor: minorUnits.nullable(),
  version,
  deletedAt,
});

/** The list fields of a Report; its data is fetched when the Report opens. */
const reportRowSchema = z.object({
  id,
  householdId: id,
  periodStart: day,
  periodEnd: day,
  generatedAt: timestamp,
  version,
});

/**
 * Every table the Replica holds, keyed by its name on the wire. A row in the
 * Replica has the same shape as on the wire.
 */
export const rowSchemas = {
  members: memberRowSchema,
  accountGroups: accountGroupRowSchema,
  accounts: accountRowSchema,
  valuations: valuationRowSchema,
  categories: categoryRowSchema,
  payees: payeeRowSchema,
  payeeAliases: payeeAliasRowSchema,
  tags: tagRowSchema,
  rules: ruleRowSchema,
  transactions: transactionRowSchema,
  entries: entryRowSchema,
  transactionTags: transactionTagRowSchema,
  accountBalanceDays: accountBalanceDayRowSchema,
  monthTotals: monthTotalRowSchema,
  fxRates: fxRateRowSchema,
  bankLinks: bankLinkRowSchema,
  reports: reportRowSchema,
};

export type SyncTableName = keyof typeof rowSchemas;
export type SyncRows = {
  [Table in SyncTableName]: z.infer<(typeof rowSchemas)[Table]>[];
};

export type HouseholdRow = z.infer<typeof householdRowSchema>;
export type MemberRow = z.infer<typeof memberRowSchema>;
export type AccountGroupRow = z.infer<typeof accountGroupRowSchema>;
export type AccountRow = z.infer<typeof accountRowSchema>;
export type ValuationRow = z.infer<typeof valuationRowSchema>;
export type CategoryRow = z.infer<typeof categoryRowSchema>;
export type PayeeRow = z.infer<typeof payeeRowSchema>;
export type TagRow = z.infer<typeof tagRowSchema>;
export type RuleRow = z.infer<typeof ruleRowSchema>;
export type TransactionRow = z.infer<typeof transactionRowSchema>;
export type EntryRow = z.infer<typeof entryRowSchema>;
export type TransactionTagRow = z.infer<typeof transactionTagRowSchema>;
export type AccountBalanceDayRow = z.infer<typeof accountBalanceDayRowSchema>;
export type FxRateRow = z.infer<typeof fxRateRowSchema>;
export type BankLinkRow = z.infer<typeof bankLinkRowSchema>;
export type ReportRow = z.infer<typeof reportRowSchema>;
