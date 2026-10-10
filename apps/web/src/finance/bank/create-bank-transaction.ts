import { randomUUID } from "node:crypto";
import { cleanPayeeName } from "../ai/clean-payee-name.ts";
import type { Suggestion } from "../ai/types.ts";
import { categoryRepository } from "../db/repositories/category-repository.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import { payeeRepository } from "../db/repositories/payee-repository.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";
import { transactionMutations } from "../sync/transaction-mutations.ts";

/** Below this confidence a bank Transaction goes to Review. */
const REVIEW_CONFIDENCE = 0.8;

interface BankRowToCreate {
  linkId: string;
  providerTxId: string;
  date: string;
  /** With the link's sign multiplier applied. */
  amountMinor: number;
  text: string;
  note: string;
}

interface BankAccount {
  id: string;
  currency: string;
  ownerMemberId: string | null;
}

interface Labels {
  kind: "expense" | "income";
  categoryId: string;
  payeeId: string | null;
  newPayee: boolean;
  memberId: string | null;
  tagIds: string[];
  confidence: number | null;
}

async function fallbackLabels(
  context: ServerWriteContext,
  amountMinor: number,
  account: BankAccount,
): Promise<Labels> {
  const kind = amountMinor < 0 ? "expense" : "income";
  const categoryId = await categoryRepository.findSystem(context.scope, kind);
  if (!categoryId) {
    throw new Error(`The Household has no Uncategorised ${kind} category`);
  }
  return {
    kind,
    categoryId,
    payeeId: null,
    newPayee: false,
    memberId: await memberRepository.activeIdOrNull(
      context.scope,
      account.ownerMemberId,
    ),
    tagIds: [],
    confidence: null,
  };
}

async function resolvePayee(
  context: ServerWriteContext,
  suggestion: Suggestion,
): Promise<{ payeeId: string | null; newPayee: boolean }> {
  const { scope } = context;
  if (suggestion.payeeId) {
    const payee = await payeeRepository.findById(scope, suggestion.payeeId);
    if (payee && !payee.deletedAt) {
      return { payeeId: payee.mergedIntoId ?? payee.id, newPayee: false };
    }
  }
  const name = cleanPayeeName(suggestion.newPayeeName ?? "");
  if (!name) return { payeeId: null, newPayee: false };
  const existing = await payeeRepository.findLiveByName(scope, name);
  if (existing) return { payeeId: existing.id, newPayee: false };
  const id = randomUUID();
  await payeeRepository.insert(scope, { id, name });
  context.markWritten();
  return { payeeId: id, newPayee: true };
}

async function labelsFrom(
  context: ServerWriteContext,
  amountMinor: number,
  account: BankAccount,
  suggestion: Suggestion | undefined,
): Promise<Labels> {
  if (!suggestion) return fallbackLabels(context, amountMinor, account);
  const category = await categoryRepository.findById(
    context.scope,
    suggestion.categoryId,
  );
  const fits =
    category &&
    !category.deletedAt &&
    (category.kind === "expense" || amountMinor > 0);
  if (!fits) return fallbackLabels(context, amountMinor, account);
  const payee = await resolvePayee(context, suggestion);
  return {
    kind: category.kind,
    categoryId: category.id,
    ...payee,
    memberId:
      (await memberRepository.activeIdOrNull(
        context.scope,
        suggestion.memberId,
      )) ??
      (await memberRepository.activeIdOrNull(
        context.scope,
        account.ownerMemberId,
      )),
    tagIds: suggestion.tagIds,
    confidence: suggestion.confidence,
  };
}

/**
 * Creates the Transaction for a bank row that matched nothing, labelled by
 * the Suggestion. Money in on an expense Category is a refund. It goes to
 * Review when the confidence is below 0.8, the Payee is new, or there is no
 * Suggestion. The ids come from the bank row, so a second run cannot create
 * a second Transaction.
 */
export async function createBankTransaction(
  context: ServerWriteContext,
  row: BankRowToCreate,
  account: BankAccount,
  suggestion: Suggestion | undefined,
  fx: FxIndex,
): Promise<string> {
  const id = nameBasedUuid(`bank:${row.linkId}:${row.providerTxId}`);
  const statsAmount =
    account.currency === fx.baseCurrency
      ? row.amountMinor
      : Math.round(
          fx.toBase(row.amountMinor, account.currency, toEpochDay(row.date)),
        );

  async function write(
    labelsOf: (nested: ServerWriteContext) => Promise<Labels>,
  ) {
    await context.scope.db.transaction(async (savepoint) => {
      const nested: ServerWriteContext = {
        ...context,
        scope: { ...context.scope, db: savepoint },
      };
      const labels = await labelsOf(nested);
      await transactionMutations.create(nested, {
        id,
        kind: labels.kind,
        status: "posted",
        date: row.date,
        amountMinor: statsAmount,
        categoryId: labels.categoryId,
        payeeId: labels.payeeId,
        memberId: labels.memberId,
        ruleId: null,
        refundOfId: null,
        note: row.note.slice(0, 2000),
        needsReview:
          labels.confidence === null ||
          labels.confidence < REVIEW_CONFIDENCE ||
          labels.newPayee,
        entries: [
          {
            id: nameBasedUuid(`bank-entry:${row.linkId}:${row.providerTxId}`),
            accountId: account.id,
            amountMinor: row.amountMinor,
            fxRate: null,
          },
        ],
        tagIds: labels.tagIds,
      });
      await transactionRepository.patch(nested.scope, id, {
        source: "bank",
        aiConfidence: labels.confidence,
      });
    });
  }

  try {
    await write((nested) =>
      labelsFrom(nested, row.amountMinor, account, suggestion),
    );
  } catch (error) {
    if (!(error instanceof MutationError)) throw error;
    await write((nested) => fallbackLabels(nested, row.amountMinor, account));
  }
  return id;
}
