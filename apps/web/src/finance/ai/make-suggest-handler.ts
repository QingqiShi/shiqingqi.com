import type { LanguageModel } from "ai";
import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { labelMemoryRepository } from "../db/repositories/label-memory-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import type { LimitFinanceRequest } from "../http/types.ts";
import { wireFields } from "../sync/wire-fields.ts";
import { suggestLabelsWithModel } from "./suggest-labels-with-model.ts";

export interface SuggestHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  getModel: () => LanguageModel | null;
  onModelError?: (error: unknown) => void;
  limitRequest?: LimitFinanceRequest;
  now?: () => Date;
}

const suggestRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  amountMinor: wireFields.minorUnits,
  date: wireFields.day,
  accountId: wireFields.id,
});

/**
 * `POST /api/finance/ai/suggest`: the model step for the editor's Suggest
 * button. The client runs the alias and history steps on the Replica first
 * and calls this only when they find nothing.
 */
export function makeSuggestHandler(dependencies: SuggestHandlerDependencies) {
  return async function POST(request: Request) {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
      rateLimit: { bucket: "ai-suggest", per: "user" },
    });
    if (session instanceof Response) return session;
    const input = await readFinanceBody(request, suggestRequestSchema);
    if (input instanceof Response) return input;
    const model = dependencies.getModel();
    if (!model) {
      return financeJson({ error: "model-unavailable" }, { status: 503 });
    }

    const memory = await labelMemoryRepository.load({
      db: dependencies.getDb(),
      householdId: session.householdId,
    });
    if (!memory.accounts.some((account) => account.id === input.accountId)) {
      return financeJson({ error: "unknown-account" }, { status: 400 });
    }
    try {
      const suggestions = await suggestLabelsWithModel(model, memory, [
        { ...input, key: "input" },
      ]);
      const suggestion = suggestions.get("input");
      if (!suggestion) {
        return financeJson({ error: "model-unavailable" }, { status: 502 });
      }
      return financeJson(suggestion);
    } catch (error) {
      dependencies.onModelError?.(error);
      return financeJson({ error: "model-unavailable" }, { status: 502 });
    }
  };
}
