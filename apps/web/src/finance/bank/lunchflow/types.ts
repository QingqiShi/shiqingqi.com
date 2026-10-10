/** One account the bank provider can read, as Lunch Flow lists it. */
export interface ProviderAccount {
  id: string;
  connectionId: string;
  name: string;
  institution: string;
  institutionLogo: string | null;
  provider: string;
  /** ISO 4217; null when the provider does not say. */
  currency: string | null;
  /** `ACTIVE`, `DISCONNECTED`, `ERROR`, or null when the provider does not say. */
  status: string | null;
}

/** A posted bank transaction. Pending ones never leave the client. */
export interface ProviderTransaction {
  id: string;
  date: string;
  /** Signed as the bank reports it, in minor units of `currency`. */
  amountMinor: number;
  currency: string;
  merchant: string;
  description: string;
  raw: unknown;
}

export interface ProviderBalance {
  amountMinor: number;
  currency: string;
}

export interface TransactionRange {
  from: string;
  to?: string;
}

/** The provider seam of Bank sync: the real Lunch Flow client and the fake both implement it. */
export interface BankClient {
  listAccounts: () => Promise<ProviderAccount[]>;
  listTransactions: (
    providerAccountId: string,
    range: TransactionRange,
  ) => Promise<ProviderTransaction[]>;
  getBalance: (providerAccountId: string) => Promise<ProviderBalance>;
}

/**
 * Why a provider call failed. `reconnect`: the bank connection expired and
 * the user must renew it in Lunch Flow. `auth`: the API key is wrong or the
 * subscription lapsed.
 */
export type BankErrorKind =
  "reconnect" | "not_found" | "unavailable" | "rate_limited" | "auth";
