import { financeFetch } from "../http/finance-fetch.ts";

/**
 * Owner changes to the Household; pull afterwards. Throws `FinanceApiError`
 * on a refusal, with status 403 for a Member who is not the owner.
 */
export const householdApiClient = {
  /** Renames the Household or changes its timezone. */
  async update(fields: { name?: string; timezone?: string }) {
    await financeFetch("/api/finance/household", {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  },

  /** Removes a Member and ends their access, or brings a removed Member back without it. */
  async setMemberRemoved(id: string, removed: boolean) {
    await financeFetch("/api/finance/household/members", {
      method: "PATCH",
      body: JSON.stringify({ id, removed }),
    });
  },
};
