import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
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
  const payee =
    row.payeeId === null ? undefined : data.lookups.payeeById.get(row.payeeId);
  const fields = {
    payeeName: payee?.name ?? "",
    payeeId: payee ? payee.id : null,
    categoryId: row.categoryId,
    memberId: row.memberId,
    tagIds: data.tagIdsByTransaction.get(row.id) ?? [],
    note: row.note,
    refund: row.kind === "expense" && row.amountMinor > 0,
    refundOfId: row.refundOfId,
  };
  if (row.kind === "transfer") {
    const from =
      entries.find((entry) => entry.amountMinor < 0) ?? entries.at(0);
    const to = entries.find((entry) => entry !== from);
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
  const { main, paysDown } = splitEntries(entries);
  const accountId = main?.accountId ?? null;
  const paysDownAccountId = paysDown?.accountId ?? null;
  return editorDraft(row.kind, row.date, {
    ...fields,
    amountText: decimal(
      main?.amountMinor ?? row.amountMinor,
      currencyOf(data, accountId),
    ),
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

/** The draft for a new Transaction: today, the signed-in Member and their usual account. */
export function draftOfNew(
  data: EditorData,
  kind: TransactionKind,
): EditorDraft {
  const accountId =
    (kind === "transfer" ? usualTransferSource(data) : null) ??
    pickDefaultAccount({
      memberId: data.memberId,
      accounts: data.openAccounts,
      recent: data.transactions,
      entriesByTransaction: data.entriesByTransaction,
    });
  const owner =
    accountId === null
      ? null
      : (data.lookups.accountById.get(accountId)?.ownerMemberId ?? null);
  const activeOwner = data.members.some((member) => member.id === owner)
    ? owner
    : null;
  return editorDraft(kind, data.today, {
    accountId,
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
