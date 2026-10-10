import type { BankClient, BankErrorKind } from "./lunchflow/types.ts";

/** Whether the Household can reach a bank provider, and with which client. */
export type BankConnection =
  | { status: "connected"; mode: "real" | "fake"; client: BankClient }
  | { status: "not_connected" };

/** A Bank link as the Connections settings show it. */
export interface BankLinkView {
  id: string;
  accountId: string;
  signMultiplier: 1 | -1;
  status: string;
  lastSyncedOn: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

/** One provider account next to the Bank link that binds it, if any. */
export interface ProviderAccountView {
  providerAccountId: string;
  name: string;
  institution: string;
  institutionLogo: string | null;
  currency: string | null;
  /** True when the provider says the bank connection needs a reconnect in Lunch Flow. */
  needsReconnect: boolean;
  link: BankLinkView | null;
}

/** `GET /api/finance/bank/accounts`. */
export type ProviderAccountsResponse =
  | {
      status: "connected";
      mode: "real" | "fake";
      accounts: ProviderAccountView[];
    }
  | { status: "not_connected" };

/** `PUT /api/finance/bank/links`. */
export interface PutBankLinkRequest {
  accountId: string;
  providerAccountId: string;
  signMultiplier?: 1 | -1;
}

/** `POST /api/finance/bank/balance`: use the bank balance as a Valuation, or dismiss the difference. */
export interface ResolveBalanceRequest {
  linkId: string;
  action: "use" | "dismiss";
}

/** The result of one link in `POST /api/finance/bank/sync-now`. */
export interface BankLinkSyncSummary {
  linkId: string;
  accountId: string;
  error: BankErrorKind | "failed" | null;
  created: number;
  linked: number;
  confirmed: number;
  missing: number;
  balanceDifferenceMinor: number | null;
}

/** `POST /api/finance/bank/sync-now`. */
export interface SyncNowResponse {
  links: BankLinkSyncSummary[];
  clock: number;
}

/** Error codes the bank and AI routes answer with, as `{ error }`. */
export type BankApiErrorCode =
  | "not-configured"
  | "forbidden-origin"
  | "unauthorised"
  | "owner-only"
  | "too-many-requests"
  | "invalid-json"
  | "invalid-body"
  | "not-connected"
  | "not-found"
  | "unknown-account"
  | "unlinkable-account"
  | "unknown-provider-account"
  | "currency-mismatch"
  | "provider-account-linked"
  | "no-bank-balance"
  | "model-unavailable"
  | BankErrorKind;
