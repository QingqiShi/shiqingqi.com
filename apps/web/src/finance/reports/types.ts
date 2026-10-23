import type { FxRateInput } from "../domain/balance/rate-to-base-of.ts";

export interface ReportSourceGroup {
  id: string;
  name: string;
  side: "asset" | "liability";
  position: number;
}

export interface ReportSourceAccount {
  id: string;
  groupId: string;
  ownerMemberId: string | null;
  name: string;
  institution: string;
  kind: string;
  currency: string;
  excludedFromNetWorth: boolean;
  closedOn: string | null;
  position: number;
  isSystem: boolean;
}

export interface ReportSourceTransaction {
  kind: "expense" | "income" | "transfer";
  status: "posted" | "expected";
  date: string;
  amountMinor: number;
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  /** In Review on the day the Report was made. */
  inReview: boolean;
}

/**
 * The plain rows a weekly Report is built from: the live Groups and
 * Accounts, the stored balance days, FX rates, names, and the Transactions
 * of the weeks the Report covers (with the four weeks before each, for the
 * averages).
 */
export interface ReportSource {
  baseCurrency: string;
  groups: readonly ReportSourceGroup[];
  accounts: readonly ReportSourceAccount[];
  balanceDays: readonly {
    accountId: string;
    day: string;
    balanceMinor: number;
  }[];
  exchangeRates: readonly FxRateInput[];
  categories: readonly {
    id: string;
    parentId: string | null;
    name: string;
    isSystem: boolean;
  }[];
  payees: readonly { id: string; name: string }[];
  members: readonly { id: string; name: string }[];
  /** Ascending by date. */
  transactions: readonly ReportSourceTransaction[];
}
