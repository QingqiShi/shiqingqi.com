import { z } from "zod";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { labellingContextRepository } from "../db/repositories/labelling-context-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { transactionSearchRepository } from "../db/repositories/transaction-search-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { findPastTransactions } from "./find-past-transactions.ts";
import type { LabellingModel } from "./label-bank-rows.ts";
import {
  UnreadableAnswer,
  readQuickAdd,
  type QuickAddReading,
} from "./read-quick-add.ts";
import type { PayeeChoice } from "./row-questions.ts";
import type { QuickAddResponse } from "./types.ts";

export interface QuickAddHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  getModel: () => LabellingModel | null;
  onModelError?: (error: unknown) => void;
}

const quickAddRequestSchema = z.object({
  text: z
    .string()
    .max(1000)
    .refine((text) => text.trim() !== ""),
});

/**
 * `POST /api/ai/quick-add`: what a line a Member typed or pasted into quick
 * add means. Code finds the amounts, days and new Payee names in the text
 * and the Household's past Transactions like it; Jev chooses among them and
 * the Household's accounts, Categories, Payees, Members and Tags. Nothing
 * is saved.
 */
export function makeQuickAddHandler(dependencies: QuickAddHandlerDependencies) {
  return async function POST(request: Request) {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
      rateLimit: { bucket: "ai-quick-add", per: "user" },
    });
    if (session instanceof Response) return session;
    const input = await readFinanceBody(request, quickAddRequestSchema);
    if (input instanceof Response) return input;
    const model = dependencies.getModel();
    if (!model) {
      return financeJson({ error: "model-unavailable" }, { status: 503 });
    }

    const db = dependencies.getDb();
    const text = input.text.trim();
    const [{ context, timezone }, past] = await Promise.all([
      withHousehold(db, session.householdId, async (scope) => ({
        context: await labellingContextRepository.load(scope),
        timezone: (await householdRepository.find(scope))?.timezone,
      })),
      findPastTransactions(
        (search) =>
          withHousehold(db, session.householdId, (scope) =>
            transactionSearchRepository.search(scope, search),
          ),
        { merchant: text, description: "" },
      ),
    ]);
    const today = todayInTimeZone(
      timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
      dependencies.now?.() ?? new Date(),
    );
    let reading: QuickAddReading;
    try {
      reading = await readQuickAdd(model, context, text, today, past);
    } catch (error) {
      if (!(error instanceof UnreadableAnswer)) {
        dependencies.onModelError?.(error);
      }
      return financeJson({ error: "model-unavailable" }, { status: 502 });
    }

    const toKnownPayee = async (payee: PayeeChoice) => {
      if (payee === null || "id" in payee) return payee;
      const named = await withHousehold(db, session.householdId, (scope) =>
        payeeRepository.findLiveByName(scope, payee.name),
      );
      return named ? { id: named.id } : payee;
    };
    const { value, runnerUp } = reading.payee;
    const [payee, payeeRunnerUp] = await Promise.all([
      toKnownPayee(value),
      runnerUp === undefined ? undefined : toKnownPayee(runnerUp),
    ]);
    return financeJson({
      text: input.text,
      ...reading,
      payee: {
        ...reading.payee,
        value: payee,
        ...(payeeRunnerUp === undefined ? {} : { runnerUp: payeeRunnerUp }),
      },
    } satisfies QuickAddResponse);
  };
}
