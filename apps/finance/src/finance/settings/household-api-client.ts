import type { InstructionChange } from "../ai/types.ts";
import { financeFetch } from "../http/finance-fetch.ts";

/**
 * Changes to the Household; pull afterwards. Throws `FinanceApiError` on a
 * refusal, with status 403 for a Member who is not the owner where only the
 * owner may make the change.
 */
export const householdApiClient = {
  /** Renames the Household or changes its timezone. */
  async update(fields: { name?: string; timezone?: string }) {
    await financeFetch("/api/household", {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  },

  /** Saves the instructions the AI follows when it labels bank rows. Any Member may. */
  async setAiInstructions(aiInstructions: string) {
    await financeFetch("/api/household/ai-instructions", {
      method: "PATCH",
      body: JSON.stringify({ aiInstructions }),
    });
  },

  /**
   * Adds one line to the AI instructions, or changes the line it replaces,
   * on the text as the server has it now. Throws `too-long` when the
   * instructions would grow past their limit.
   */
  async changeAiInstructions(change: InstructionChange) {
    await financeFetch("/api/household/ai-instructions", {
      method: "PATCH",
      body: JSON.stringify({ change }),
    });
  },

  /** Removes a Member and ends their access, or brings a removed Member back without it. */
  async setMemberRemoved(id: string, removed: boolean) {
    await financeFetch("/api/household/members", {
      method: "PATCH",
      body: JSON.stringify({ id, removed }),
    });
  },
};
