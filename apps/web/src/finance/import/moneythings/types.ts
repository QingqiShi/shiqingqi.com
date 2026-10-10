import type {
  accountGroups,
  accounts,
  categories,
  entries,
  fxRates,
  members,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import type { GroupOverrides } from "./assign-group.ts";
import type { OwnerKey } from "./split-owner-prefix.ts";

/**
 * The MoneyThings Core Data rows the importer reads, with Core Data column
 * names turned into plain fields. Times are Core Data seconds (since
 * 2001-01-01T00:00:00Z); amounts are the stored floats, not yet rounded.
 */

export type SourceAssetType =
  | "Savings Account"
  | "Credit Account"
  | "Investment Account"
  | "Recoverable Account"
  | "Repayable Account";

export interface SourceAccount {
  pk: number;
  id: string;
  name: string;
  assetType: SourceAssetType;
  notCounted: boolean;
  noLongerUsed: boolean;
  order: number;
  instalmentId: string | null;
}

export interface SourceSubAccount {
  pk: number;
  entity: number;
  id: string;
  accountPk: number;
  name: string | null;
  currency: string;
  /** A balance anchor for a balance holder; a signed entry for a ledger row. */
  amount: number;
  /** The anchor time for a balance holder; the entry time for a ledger row. */
  activationTime: number;
  notCounted: boolean;
  noLongerUsed: boolean;
  order: number;
  creditLimit: number | null;
  statementDate: number | null;
  paymentDueDate: number | null;
  paymentSubAccountId: string | null;
  /** Recoverable entries: the transaction that lent or returned the money. */
  transactionId: string | null;
  /** Repayable entries: the transaction that made the repayment. */
  transactionId1: string | null;
  remark: string;
}

interface SourceModifyLog {
  id: string;
  subAccountPk: number;
  activationTime: number;
  amount: number;
}

export interface SourceTransaction {
  id: string;
  type: number;
  /** 0 posted; 1 or 2 a future occurrence of a schedule. */
  pending: number;
  flowTime: number;
  accountId: string;
  subAccountId: string;
  currency: string;
  /** The statistics amount in the primary currency (ZAMOUNT). */
  amount: number;
  /** The amount that moved the sub-account, in its currency. */
  accountCurrencyAmount: number;
  accountCurrencyRate: number | null;
  categoryId: string | null;
  tagIds: string[];
  remark: string;
  transferId: string | null;
  refundId: string | null;
  cronId: string | null;
}

export interface SourceCategory {
  pk: number;
  entity: number;
  id: string;
  name: string;
  /** Primary rows only: Expenditure, Income or Transfer. */
  type: string | null;
  parentPk: number | null;
  noLongerUsed: boolean;
  notCounted: boolean;
  order: number;
  emoji: string;
  color: string;
}

interface SourceTagType {
  pk: number;
  name: string;
  order: number;
}

export interface SourceTag {
  pk: number;
  id: string;
  name: string;
  typePk: number | null;
  order: number;
}

interface SourceFxRate {
  id: string;
  symbol: string;
  price: number;
  updateTime: number;
}

interface SourceTemplate {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  categoryId: string | null;
  outSubAccountId: string | null;
  inSubAccountId: string | null;
  tagIds: string[];
  remark: string;
  linkedRepayableAccountIds: string[];
  linkedRepayableAmounts: number[];
  recoverableAccountIds: string[];
  recoverableAmounts: number[];
}

export interface SourceCrontab {
  id: string;
  templateId: string;
  unit: string;
  interval: number;
  supplementary: string;
  beginDate: number;
  stopped: boolean;
  needsConfirmation: boolean;
  endDate: number | null;
}

export interface SourceManifest {
  format: string;
  version: number;
  createdAt: string;
}

export interface SourceData {
  manifest: SourceManifest;
  sceneId: string;
  sceneName: string;
  accounts: SourceAccount[];
  subAccounts: SourceSubAccount[];
  modifyLogs: SourceModifyLog[];
  transactions: SourceTransaction[];
  categories: SourceCategory[];
  tagTypes: SourceTagType[];
  tags: SourceTag[];
  fxRates: SourceFxRate[];
  templates: SourceTemplate[];
  crontabs: SourceCrontab[];
}

export type MemberRow = typeof members.$inferInsert;
export type AccountGroupRow = typeof accountGroups.$inferInsert;
export type AccountRow = typeof accounts.$inferInsert;
export type ValuationRow = typeof valuations.$inferInsert;
export type CategoryRow = typeof categories.$inferInsert;
export type PayeeRow = typeof payees.$inferInsert;
export type TagRow = typeof tags.$inferInsert;
export type RuleRow = typeof rules.$inferInsert;
export type TransactionRow = typeof transactions.$inferInsert;
export type EntryRow = typeof entries.$inferInsert;
export type TransactionTagRow = typeof transactionTags.$inferInsert;
export type FxRateRow = typeof fxRates.$inferInsert;

/** Every row one MoneyThings import writes, in foreign-key order. */
export interface ImportRows {
  members: MemberRow[];
  accountGroups: AccountGroupRow[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  payees: PayeeRow[];
  tags: TagRow[];
  rules: RuleRow[];
  valuations: ValuationRow[];
  transactions: TransactionRow[];
  entries: EntryRow[];
  transactionTags: TransactionTagRow[];
  fxRates: FxRateRow[];
}

export interface MapOptions {
  householdId: string;
  memberIds: Record<OwnerKey, string>;
  /** Member names; MoneyThings only knows the 老公 and 老婆 prefixes. */
  memberNames: Record<OwnerKey, string>;
  groupOverrides: GroupOverrides;
  timeZone: string;
  baseCurrency: string;
  /** The household day the backup was taken: "today" for the import. */
  importDate: string;
  /** Expected transactions after this day are dropped; their rule makes them again. */
  expectedUntil: string;
  /** The time stamped on archived categories and paused rules. */
  importedAt: Date;
}
