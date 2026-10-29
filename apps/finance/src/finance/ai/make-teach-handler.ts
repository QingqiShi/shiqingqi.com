import type { LanguageModel } from "ai";
import { z } from "zod";
import { toEntryAmount } from "../bank/to-entry-amount.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { wireFields } from "../sync/wire-fields.ts";
import {
  draftInstructionChange,
  type CorrectionToTeach,
} from "./draft-instruction-change.ts";
import type { InstructionChange } from "./types.ts";

export interface TeachHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  getModel: () => LanguageModel | null;
  onModelError?: (error: unknown) => void;
}

const name = z.string().trim().max(200);
const namedLabelsSchema = z.object({
  kind: z.enum(["expense", "income", "transfer"]),
  category: z.string().trim().max(500).nullable(),
  payee: name.nullable(),
  tags: z.array(name).max(50),
  member: name.nullable(),
  accounts: z.array(name).max(20),
});

const teachRequestSchema = z.object({
  transactionId: wireFields.id,
  ai: namedLabelsSchema,
  member: namedLabelsSchema,
});

/** The bank row of a Transaction, with what the server knows about it. */
async function loadCorrection(
  db: FinanceDb,
  householdId: string,
  transactionId: string,
): Promise<Omit<CorrectionToTeach, "ai" | "member"> | null> {
  return withHousehold(db, householdId, async (scope) => {
    const transaction = await transactionRepository.findById(
      scope,
      transactionId,
    );
    if (!transaction || transaction.deletedAt) return null;
    const bankRow = (
      await bankTransactionRepository.findByTransactionId(scope, transactionId)
    ).at(0);
    if (!bankRow) return null;
    const link = await bankLinkRepository.findById(scope, bankRow.linkId);
    if (!link) return null;
    const account = await accountRepository.findById(scope, link.accountId);
    const household = await householdRepository.find(scope);
    return {
      instructions: household?.aiInstructions ?? "",
      aiReason: transaction.aiReason,
      row: {
        date: bankRow.date,
        amountMinor: toEntryAmount(bankRow.amountMinor, link),
        currency: bankRow.currency,
        account: account?.name ?? "?",
        merchant: bankRow.merchant,
        description: bankRow.description,
      },
    };
  });
}

/**
 * `POST /api/ai/teach`: "Teach the AI" after a Member corrected the
 * AI's labels on a Transaction from the bank. The client sends both sets of
 * labels by name, because the correction may not have reached the server
 * yet. The answer is a draft: nothing is saved until the Member saves it to
 * the AI instructions.
 */
export function makeTeachHandler(dependencies: TeachHandlerDependencies) {
  return async function POST(request: Request) {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
      rateLimit: { bucket: "ai-teach", per: "user" },
    });
    if (session instanceof Response) return session;
    const input = await readFinanceBody(request, teachRequestSchema);
    if (input instanceof Response) return input;
    const model = dependencies.getModel();
    if (!model) {
      return financeJson({ error: "model-unavailable" }, { status: 503 });
    }

    const loaded = await loadCorrection(
      dependencies.getDb(),
      session.householdId,
      input.transactionId,
    );
    if (!loaded) return financeJson({ error: "not-found" }, { status: 404 });

    try {
      const change = await draftInstructionChange(model, {
        ...loaded,
        ai: input.ai,
        member: input.member,
      });
      return financeJson(change satisfies InstructionChange);
    } catch (error) {
      dependencies.onModelError?.(error);
      return financeJson({ error: "model-unavailable" }, { status: 502 });
    }
  };
}
