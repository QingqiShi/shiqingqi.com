import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";

interface LedgerEntrySubtitleSources {
  transaction: Pick<TransactionRow, "kind" | "note">;
  entries: readonly Pick<EntryRow, "accountId" | "amountMinor">[];
  /** The account of the Ledger. */
  accountId: string;
  title: string;
  categoryLabel: string | undefined;
  accountLabel: (accountId: string) => string;
}

export function ledgerEntrySubtitle({
  transaction,
  entries,
  accountId,
  title,
  categoryLabel,
  accountLabel,
}: LedgerEntrySubtitleSources): string {
  const note = transaction.note.trim();
  const parts: string[] = [];
  if (transaction.kind === "transfer") {
    const own = entries.find((entry) => entry.accountId === accountId);
    const other = entries.find((entry) => entry.accountId !== accountId);
    if (other) {
      const arrow = (own?.amountMinor ?? 0) < 0 ? "→" : "←";
      parts.push(`${arrow} ${accountLabel(other.accountId)}`);
    }
  } else if (categoryLabel !== undefined && categoryLabel !== title) {
    parts.push(categoryLabel);
  }
  if (note !== "" && note !== title) parts.push(note);
  return parts.join(" · ");
}
