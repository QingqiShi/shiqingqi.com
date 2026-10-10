import { eq } from "drizzle-orm";
import { learnFromBankTransaction } from "../ai/learn-from-bank-transaction.ts";
import { transactionRepository } from "../db/repositories/transaction-repository.ts";
import type { WriteScope } from "../db/repositories/types.ts";
import { transactions } from "../db/schema.ts";
import { MutationError } from "./mutation-error.ts";
import type { TransactionInput, TransactionPatch } from "./mutation-schema.ts";
import type { WriteContext } from "./types.ts";
import { validateTransaction } from "./validate-transaction.ts";

/** The Transaction fields that `month_totals` sums by. */
const MONTH_TOTAL_FIELDS = [
  "kind",
  "date",
  "amountMinor",
  "categoryId",
  "memberId",
] as const;

/** Marks the balances that Entries of a Transaction on `date` may change. */
function touchEntries(
  context: WriteContext,
  entries: readonly { accountId: string; date?: string }[],
  date: string,
) {
  for (const entry of entries) {
    context.touches.account(
      entry.accountId,
      entry.date !== undefined && entry.date < date ? entry.date : date,
    );
  }
}

/** Marks the balances and month totals a Transaction on `date` with these Entries may change. */
async function touchTransaction(
  context: WriteContext,
  transactionId: string,
  date: string,
) {
  touchEntries(
    context,
    await transactionRepository.findEntryAccounts(context.scope, [
      transactionId,
    ]),
    date,
  );
  context.touches.month(date);
}

async function findLive(scope: WriteScope, id: string) {
  const existing = await transactionRepository.findById(scope, id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) throw new MutationError("deleted");
  return existing;
}

async function refreshSearchText(scope: WriteScope, id: string) {
  await transactionRepository.refreshSearchText(scope, eq(transactions.id, id));
}

async function create(context: WriteContext, input: TransactionInput) {
  const { scope } = context;
  await validateTransaction(scope, input);
  const inserted = await transactionRepository.insert(scope, {
    id: input.id,
    kind: input.kind,
    status: input.status,
    date: input.date,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    payeeId: input.payeeId,
    memberId: input.memberId,
    ruleId: input.ruleId,
    refundOfId: input.refundOfId,
    note: input.note,
    needsReview: input.needsReview,
    source: "manual",
  });
  if (!inserted) {
    const existing = await transactionRepository.findById(scope, input.id);
    throw existing
      ? new MutationError("invalid", "The transaction already exists")
      : new MutationError("forbidden");
  }
  if (
    !(await transactionRepository.replaceEntries(
      scope,
      input.id,
      input.date,
      input.entries,
    ))
  ) {
    throw new MutationError("forbidden", "An entry id belongs elsewhere");
  }
  await transactionRepository.replaceTags(scope, input.id, [
    ...new Set(input.tagIds),
  ]);
  await refreshSearchText(scope, input.id);
  touchEntries(context, input.entries, input.date);
  context.touches.month(input.date);
}

async function update(
  context: WriteContext,
  id: string,
  patch: TransactionPatch,
) {
  const { scope } = context;
  const existing = await findLive(scope, id);
  const currentEntries = await transactionRepository.findEntries(scope, id);
  const currentTagIds = await transactionRepository.findTagIds(scope, id);
  const { entries: patchEntries, tagIds: patchTagIds, ...fields } = patch;
  const merged = {
    ...existing,
    ...fields,
    entries: patchEntries ?? currentEntries,
    tagIds: patchTagIds ?? currentTagIds,
  };
  await validateTransaction(scope, merged, {
    ...existing,
    entries: currentEntries,
    tagIds: currentTagIds,
  });

  const movesBalances =
    patchEntries !== undefined || merged.date !== existing.date;
  const movesMonthTotals = MONTH_TOTAL_FIELDS.some(
    (field) => merged[field] !== existing[field],
  );
  if (movesBalances) {
    touchEntries(context, currentEntries, existing.date);
    touchEntries(context, merged.entries, merged.date);
  }
  if (movesMonthTotals) {
    context.touches.month(existing.date);
    context.touches.month(merged.date);
  }
  await transactionRepository.patch(scope, id, fields);
  if (patchEntries) {
    if (
      !(await transactionRepository.replaceEntries(
        scope,
        id,
        merged.date,
        patchEntries,
      ))
    ) {
      throw new MutationError("forbidden", "An entry id belongs elsewhere");
    }
  } else if (merged.date !== existing.date) {
    await transactionRepository.setEntryDates(scope, id, merged.date);
  }
  if (patchTagIds) {
    await transactionRepository.replaceTags(scope, id, [
      ...new Set(patchTagIds),
    ]);
  }
  await refreshSearchText(scope, id);

  const reviewCleared = existing.needsReview && !merged.needsReview;
  const relabelled =
    merged.payeeId !== existing.payeeId ||
    merged.categoryId !== existing.categoryId;
  if ((reviewCleared || relabelled) && merged.payeeId !== null) {
    await learnFromBankTransaction(scope, id, merged.payeeId);
  }
}

async function remove(context: WriteContext, id: string) {
  const existing = await transactionRepository.findById(context.scope, id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  await touchTransaction(context, id, existing.date);
  await transactionRepository.softDelete(context.scope, id);
}

async function restore(context: WriteContext, id: string) {
  const existing = await transactionRepository.findById(context.scope, id);
  if (!existing) throw new MutationError("not_found");
  if (!existing.deletedAt) return;
  await transactionRepository.restore(context.scope, id);
  await touchTransaction(context, id, existing.date);
}

async function confirmExpected(
  context: WriteContext,
  id: string,
  patch: TransactionPatch | undefined,
) {
  const existing = await findLive(context.scope, id);
  if (patch && Object.keys(patch).length > 0) {
    await update(context, id, patch);
  }
  if (existing.status === "expected") {
    await transactionRepository.patch(context.scope, id, {
      status: "posted",
    });
    await touchTransaction(context, id, patch?.date ?? existing.date);
  }
}

async function skipExpected(context: WriteContext, id: string) {
  const existing = await transactionRepository.findById(context.scope, id);
  if (!existing) throw new MutationError("not_found");
  if (existing.deletedAt) return;
  if (existing.status !== "expected") {
    throw new MutationError("invalid", "The transaction is confirmed already");
  }
  await transactionRepository.softDelete(context.scope, id);
}

export const transactionMutations = {
  create,
  update,
  remove,
  restore,
  confirmExpected,
  skipExpected,
};
