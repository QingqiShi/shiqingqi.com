import type {
  InstructionChange,
  SuggestRequest,
  SuggestResponse,
  TeachRequest,
} from "../ai/types.ts";
import { financeFetch } from "../http/finance-fetch.ts";
import type {
  BankLinkView,
  CredentialView,
  ProviderAccountsResponse,
  PutBankLinkRequest,
  SyncNowResponse,
  UnbackedEntriesResponse,
} from "./types.ts";

async function sendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await financeFetch(path, init);
  return (await response.json()) as T;
}

/** Fetch wrappers for the Connections settings, Review, the editor's Suggest button and "Teach the AI". */
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

  /** The Entries behind a link's balance difference, which no bank row backs. */
  listUnbackedEntries(linkId: string, signal?: AbortSignal) {
    return sendJson<UnbackedEntriesResponse>(
      `/api/finance/bank/unbacked-entries?linkId=${encodeURIComponent(linkId)}`,
      { signal },
    );
  },

  /** Keeps a Transaction that no bank row of the link backs, so the balance check stops listing it. */
  async keepTransaction(linkId: string, transactionId: string) {
    await financeFetch("/api/finance/bank/kept-transactions", {
      method: "PUT",
      body: JSON.stringify({ linkId, transactionId }),
    });
  },

  /** Undoes `keepTransaction`. */
  async unkeepTransaction(linkId: string, transactionId: string) {
    const query = new URLSearchParams({ linkId, transactionId });
    await financeFetch(
      `/api/finance/bank/kept-transactions?${query.toString()}`,
      { method: "DELETE" },
    );
  },

  /** The AI's labels for one Transaction, from the labeller that labels bank rows. */
  suggest(input: SuggestRequest) {
    return sendJson<SuggestResponse>("/api/finance/ai/suggest", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** A draft change to the AI instructions after a Member corrected the AI's labels. Nothing is saved. */
  teach(input: TeachRequest) {
    return sendJson<InstructionChange>("/api/finance/ai/teach", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
