import type {
  AccountRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";

const RECENT = 300;

interface DefaultAccountInput {
  memberId: string | null;
  /** Accounts a new Transaction may use, in display order. */
  accounts: readonly Pick<AccountRow, "id" | "kind" | "ownerMemberId">[];
  /** Transactions, newest first. */
  recent: readonly TransactionRow[];
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>;
}

/**
 * The account a new expense or income starts on when nothing better is
 * known: the cash or credit account the Member used most in their recent
 * Transactions, else the Member's first cash account, else the first cash
 * account.
 */
export function pickDefaultAccount(input: DefaultAccountInput): string | null {
  const spendable = new Map(
    input.accounts
      .filter((account) => account.kind === "cash" || account.kind === "credit")
      .map((account) => [account.id, account]),
  );
  const counts = new Map<string, number>();
  let seen = 0;
  for (const row of input.recent) {
    if (seen >= RECENT) break;
    if (row.kind === "transfer" || row.status !== "posted") continue;
    if (input.memberId !== null && row.memberId !== input.memberId) continue;
    seen++;
    const accountId = input.entriesByTransaction.get(row.id)?.[0]?.accountId;
    if (accountId === undefined || !spendable.has(accountId)) continue;
    counts.set(accountId, (counts.get(accountId) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [accountId, count] of counts) {
    if (count > bestCount) {
      best = accountId;
      bestCount = count;
    }
  }
  if (best !== null) return best;

  const cash = input.accounts.filter((account) => account.kind === "cash");
  return (
    cash.find((account) => account.ownerMemberId === input.memberId)?.id ??
    cash.at(0)?.id ??
    input.accounts.at(0)?.id ??
    null
  );
}
