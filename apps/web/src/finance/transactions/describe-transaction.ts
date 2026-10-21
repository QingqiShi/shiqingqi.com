import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";

interface DescribeTransactionSources {
  transaction: Pick<TransactionRow, "kind" | "note">;
  entries: readonly Pick<EntryRow, "accountId" | "amountMinor">[];
  /** The account of the Ledger, or null in a list across accounts. */
  accountId: string | null;
  payeeName: string | undefined;
  categoryLabel: string | undefined;
  kindLabel: string;
  tagNames: readonly string[];
  accountLabel: (accountId: string) => string;
}

export interface TransactionDescription {
  title: string;
  /** The Category and the note, or the accounts of a transfer. */
  subtitle: string;
  /** The account, unless the Ledger already says it, then the Tags. */
  meta: string;
}

/** The Entry money leaves a transfer from, and the one it goes to. */
export function transferLegs<Entry extends Pick<EntryRow, "amountMinor">>(
  entries: readonly Entry[],
) {
  const from = entries.find((entry) => entry.amountMinor < 0) ?? entries.at(0);
  const to = entries.find((entry) => entry !== from);
  return { from, to };
}

/** The words a row shows for one Transaction, the same in the Transactions list and in a Ledger. */
export function describeTransaction({
  transaction,
  entries,
  accountId,
  payeeName,
  categoryLabel,
  kindLabel,
  tagNames,
  accountLabel,
}: DescribeTransactionSources): TransactionDescription {
  const note = transaction.note.trim();
  const title = payeeName ?? categoryLabel ?? (note || kindLabel);
  const isTransfer = transaction.kind === "transfer";

  const parts: string[] = [];
  if (isTransfer) {
    if (accountId === null) {
      const { from, to } = transferLegs(entries);
      const label = [from, to]
        .map((entry) => (entry ? accountLabel(entry.accountId) : ""))
        .filter((part) => part !== "")
        .join(" → ");
      if (label !== "") parts.push(label);
    } else {
      const own = entries.find((entry) => entry.accountId === accountId);
      const other = entries.find((entry) => entry.accountId !== accountId);
      if (other) {
        const arrow = (own?.amountMinor ?? 0) < 0 ? "→" : "←";
        parts.push(`${arrow} ${accountLabel(other.accountId)}`);
      }
    }
  } else if (categoryLabel !== undefined && categoryLabel !== title) {
    parts.push(categoryLabel);
  }
  if (note !== "" && note !== title) parts.push(note);

  const account = entries.at(0)?.accountId;
  const meta = [
    !isTransfer && accountId === null && account !== undefined
      ? accountLabel(account)
      : "",
    ...tagNames.map((name) => `#${name}`),
  ]
    .filter((part) => part !== "")
    .join("  ");

  return {
    title,
    subtitle: parts.join(" · "),
    meta,
  };
}
