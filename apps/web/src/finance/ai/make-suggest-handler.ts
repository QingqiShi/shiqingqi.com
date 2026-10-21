import { z } from "zod";
import { bankTransactionRepository } from "../db/repositories/bank-transaction-repository.ts";
import { labellingContextRepository } from "../db/repositories/labelling-context-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { transactionSearchRepository } from "../db/repositories/transaction-search-repository.ts";
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
  labelBankRows,
  type LabellingModel,
  type RowLabel,
} from "./label-bank-rows.ts";
import type { SuggestResponse } from "./types.ts";

export interface SuggestHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  getModel: () => LabellingModel | null;
  onModelError?: (error: unknown) => void;
}

const suggestRequestSchema = z.object({
  transactionId: wireFields.id.optional(),
  text: z.string().trim().min(1).max(500),
  amountMinor: wireFields.minorUnits,
  date: wireFields.day,
  accountId: wireFields.id,
});

const REF = "1";

/**
 * `POST /api/finance/ai/suggest`: the editor's Suggest button. It runs the
 * labeller that labels bank rows on one row: the Transaction's bank text
 * when it came from the bank, else the text the Member typed.
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

    const db = dependencies.getDb();
    const { context, bankRow } = await withHousehold(
      db,
      session.householdId,
      async (scope) => ({
        context: await labellingContextRepository.load(scope),
        bankRow: input.transactionId
          ? (
              await bankTransactionRepository.findByTransactionId(
                scope,
                input.transactionId,
              )
            ).at(0)
          : undefined,
      }),
    );
    const account = context.accounts.find(
      (candidate) => candidate.id === input.accountId,
    );
    if (!account || account.isSystem) {
      return financeJson({ error: "unknown-account" }, { status: 400 });
    }

    let label: RowLabel;
    try {
      const results = await labelBankRows(
        model,
        context,
        [
          {
            ref: REF,
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            merchant: bankRow ? bankRow.merchant : input.text,
            description: bankRow ? bankRow.description : "",
          },
        ],
        (search) =>
          withHousehold(db, session.householdId, (scope) =>
            transactionSearchRepository.search(scope, search),
          ),
      );
      const result = results.get(REF);
      if (!result?.ok) {
        return financeJson({ error: "model-unavailable" }, { status: 502 });
      }
      label = result.label;
    } catch (error) {
      dependencies.onModelError?.(error);
      return financeJson({ error: "model-unavailable" }, { status: 502 });
    }

    const { payee } = label;
    const newName = payee !== null && "name" in payee ? payee.name : null;
    const named =
      newName === null
        ? undefined
        : await withHousehold(db, session.householdId, (scope) =>
            payeeRepository.findLiveByName(scope, newName),
          );
    return financeJson({
      kind: label.kind,
      categoryId: label.categoryId,
      payeeId: payee !== null && "id" in payee ? payee.id : (named?.id ?? null),
      newPayeeName: named ? null : newName,
      tagIds: label.tagIds,
      memberId: label.memberId,
      toAccountId:
        label.transfer?.type === "account" ? label.transfer.accountId : null,
      paysDownAccountId: label.paysDownAccountId,
      reason: label.reason,
    } satisfies SuggestResponse);
  };
}
