import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { transferLegs } from "../transactions/describe-transaction.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import { editorDraft, type EditorDraft } from "./editor-draft.ts";
import { pickDefaultAccount } from "./pick-default-account.ts";
import { splitEntries } from "./split-entries.ts";
import type { EditorData } from "./use-editor-data.ts";

function decimal(minor: number, currency: string) {
  return minorUnitsToDecimalString(Math.abs(minor), currency);
}

function currencyOf(data: EditorData, accountId: string | null) {
  return (
    (accountId === null
      ? undefined
      : data.lookups.accountById.get(accountId)?.currency) ?? data.baseCurrency
  );
}

/** The draft for an existing Transaction, as the form shows it. */
export function draftOfTransaction(
  data: EditorData,
  transactionId: string,
): EditorDraft | null {
  const row = data.transactionsTable.get(transactionId);
  if (!row) return null;
  const entries = data.entriesByTransaction.get(row.id) ?? [];
  const { main, paysDown } = splitEntries(entries);
  const payee =
    row.payeeId === null ? undefined : data.lookups.payeeById.get(row.payeeId);
  const fields = {
    payeeName: payee?.name ?? "",
    payeeId: payee ? payee.id : null,
    categoryId: row.categoryId,
    memberId: row.memberId,
    tagIds: data.tagIdsByTransaction.get(row.id) ?? [],
    note: row.note,
    refund: row.kind === "expense" && (main?.amountMinor ?? 0) > 0,
    refundOfId: row.refundOfId,
  };
  if (row.kind === "transfer") {
    const { from, to } = transferLegs(entries);
    const fromCurrency = currencyOf(data, from?.accountId ?? null);
    const toCurrency = currencyOf(data, to?.accountId ?? null);
    return editorDraft("transfer", row.date, {
      ...fields,
      amountText: from ? decimal(from.amountMinor, fromCurrency) : "",
      toAmountText:
        to && toCurrency !== fromCurrency
          ? decimal(to.amountMinor, toCurrency)
          : "",
      accountId: from?.accountId ?? null,
      toAccountId: to?.accountId ?? null,
    });
  }
  const accountId = main?.accountId ?? null;
  const paysDownAccountId = paysDown?.accountId ?? null;
  return editorDraft(row.kind, row.date, {
    ...fields,
    amountText: main
      ? decimal(main.amountMinor, currencyOf(data, accountId))
      : "",
    accountId,
    paysDownAccountId,
    paysDownAmountText: paysDown
      ? decimal(paysDown.amountMinor, currencyOf(data, paysDownAccountId))
      : "",
  });
}

const TRANSFER_HISTORY = 200;

/** The open account most of the recent transfers came from, such as a current account. */
export function usualTransferSource(data: EditorData) {
  const counts = new Map<string, number>();
  let seen = 0;
  for (const row of data.transactions) {
    if (row.kind !== "transfer" || row.status !== "posted") continue;
    const from = data.entriesByTransaction
      .get(row.id)
      ?.find((entry) => entry.amountMinor < 0);
    if (from) counts.set(from.accountId, (counts.get(from.accountId) ?? 0) + 1);
    if (++seen >= TRANSFER_HISTORY) break;
  }
  let best: string | null = null;
  for (const account of data.openAccounts) {
    const count = counts.get(account.id) ?? 0;
    if (count > 0 && (best === null || count > (counts.get(best) ?? 0))) {
      best = account.id;
    }
  }
  return best;
}

/**
 * The draft for a new Transaction: today, the signed-in Member and their
 * usual account, or `accountId` when a new Transaction can use it.
 */
export function draftOfNew(
  data: EditorData,
  kind: TransactionKind,
  accountId: string | null = null,
): EditorDraft {
  const chosen = data.openAccounts.some((account) => account.id === accountId)
    ? accountId
    : null;
  const start =
    chosen ??
    (kind === "transfer" ? usualTransferSource(data) : null) ??
    pickDefaultAccount({
      memberId: data.memberId,
      accounts: data.openAccounts,
      recent: data.transactions,
      entriesByTransaction: data.entriesByTransaction,
    });
  const owner =
    start === null
      ? null
      : (data.lookups.accountById.get(start)?.ownerMemberId ?? null);
  const activeOwner = data.members.some((member) => member.id === owner)
    ? owner
    : null;
  return editorDraft(kind, data.today, {
    accountId: start,
    memberId: activeOwner ?? data.memberId,
  });
}

/** A new refund of `originalId`: its Payee, Category, account and amount, given back. */
export function draftOfRefund(
  data: EditorData,
  originalId: string,
): EditorDraft | null {
  const original = draftOfTransaction(data, originalId);
  if (!original || original.kind !== "expense") return null;
  return {
    ...original,
    date: data.today,
    note: "",
    refund: true,
    refundOfId: originalId,
    paysDownAccountId: null,
    paysDownAmountText: "",
  };
}
