import type { BankClient, BankErrorKind } from "./lunchflow/types.ts";

/** What the owner sees of the Connection's API key: never the key itself. */
export interface CredentialView {
  lastFour: string;
  savedAt: string;
}

/** No key is stored, or the stored key no longer opens. */
interface NotConnected {
  status: "not_connected";
  /** A key is stored but does not open with `FINANCE_CREDENTIAL_KEY`, so the owner must enter it again. */
  keyUnreadable?: true;
}

/** Whether the Household can reach a bank provider, and with which client. */
export type BankConnection =
  | {
      status: "connected";
      mode: "real" | "fake";
      credential: CredentialView;
      client: BankClient;
    }
  | NotConnected;

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
  bankLoginId: string;
  name: string;
  institution: string;
  institutionLogo: string | null;
  currency: string | null;
  /** True when the provider says the bank connection needs a reconnect in Lunch Flow. */
  needsReconnect: boolean;
  link: BankLinkView | null;
}

/** `GET /api/bank/accounts`. */
export type ProviderAccountsResponse =
  | {
      status: "connected";
      mode: "real" | "fake";
      credential: CredentialView;
      accounts: ProviderAccountView[];
    }
  | NotConnected;

/** `PUT /api/bank/links`. */
export interface PutBankLinkRequest {
  accountId: string;
  providerAccountId: string;
  signMultiplier?: 1 | -1;
}

/** `GET /api/bank/unbacked-entries`: the Entries behind a balance difference, oldest first. */
export interface UnbackedEntriesResponse {
  entryIds: string[];
}

/** The result of one link in `POST /api/bank/sync-now`. */
export interface BankLinkSyncSummary {
  linkId: string;
  accountId: string;
  error: BankErrorKind | "failed" | null;
  /** Rows that matched nothing and wait for the AI to label them. */
  waiting: number;
  linked: number;
  confirmed: number;
  missing: number;
}

/** `POST /api/bank/sync-now`. */
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
  | "model-unavailable"
  | BankErrorKind;
