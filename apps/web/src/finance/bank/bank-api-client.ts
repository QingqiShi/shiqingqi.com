import type { LabelInput, Suggestion } from "../ai/types.ts";
import { financeFetch } from "../http/finance-fetch.ts";
import type {
  BankLinkView,
  CredentialView,
  ProviderAccountsResponse,
  PutBankLinkRequest,
  ResolveBalanceRequest,
  SyncNowResponse,
} from "./types.ts";

async function sendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await financeFetch(path, init);
  return (await response.json()) as T;
}

/** Fetch wrappers for the Connections settings, Review and the editor's Suggest button. */
export const bankApiClient = {
  /** The provider accounts with their link state, or `not_connected`. */
  listProviderAccounts() {
    return sendJson<ProviderAccountsResponse>("/api/finance/bank/accounts");
  },

  /** Stores the owner's Lunch Flow API key; throws `FinanceApiError` `auth` when Lunch Flow refuses it. */
  putCredential(apiKey: string) {
    return sendJson<CredentialView>("/api/finance/bank/credential", {
      method: "PUT",
      body: JSON.stringify({ apiKey }),
    });
  },

  /** Forgets the API key; the Bank links stay. */
  async removeCredential() {
    await financeFetch("/api/finance/bank/credential", { method: "DELETE" });
  },

  /** Binds a cash or credit account to a provider account; binding again updates the link. */
  putLink(request: PutBankLinkRequest) {
    return sendJson<BankLinkView>("/api/finance/bank/links", {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  async removeLink(linkId: string) {
    await financeFetch(
      `/api/finance/bank/links?linkId=${encodeURIComponent(linkId)}`,
      {
        method: "DELETE",
      },
    );
  },

  /** Syncs every link now. Pull afterwards: the result's `clock` is the Household clock after the sync. */
  syncNow() {
    return sendJson<SyncNowResponse>("/api/finance/bank/sync-now", {
      method: "POST",
      body: "{}",
    });
  },

  /** "Use bank balance" (`use`) or "Dismiss" (`dismiss`) on a balance difference. */
  resolveBalance(request: ResolveBalanceRequest) {
    return sendJson<{ clock: number }>("/api/finance/bank/balance", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  /** The model step of the labelling pipeline; run `suggestLabelsFromMemory` on the Replica first. */
  suggest(input: LabelInput) {
    return sendJson<Suggestion>("/api/finance/ai/suggest", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
