import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import {
  createTransactionAmount,
  type TransactionAmountOf,
} from "../domain/transactions/create-transaction-amount.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { selectEntriesByTransaction } from "./select-entries-by-transaction.ts";
import { selectFxIndex } from "./select-fx-index.ts";

const NO_ENTRIES: readonly EntryRow[] = [];

interface CachedAmount {
  row: TransactionRow;
  entries: readonly EntryRow[];
  amountOf: TransactionAmountOf;
  amount: number;
}

/** By Transaction id, from the last call. */
let cachedById = new Map<string, CachedAmount>();

let lastAmountOf: {
  fx: FxIndex;
  accounts: ReplicaSnapshot["tables"]["accounts"];
  amountOf: TransactionAmountOf;
} | null = null;

let last: {
  inputs: readonly unknown[];
  amounts: ReadonlyMap<string, number>;
} | null = null;

function amountOfFor(snapshot: ReplicaSnapshot) {
  const fx = selectFxIndex(snapshot);
  const accounts = snapshot.tables.accounts;
  if (lastAmountOf?.fx !== fx || lastAmountOf.accounts !== accounts) {
    lastAmountOf = {
      fx,
      accounts,
      amountOf: createTransactionAmount(fx, (id) => accounts.get(id)),
    };
  }
  return lastAmountOf.amountOf;
}

/**
 * The amount in the base currency of each live expense and income, by
 * Transaction id; see `createTransactionAmount`. A transfer has none. Only a
 * Transaction whose row or Entries changed is worked out again, unless the
 * accounts or the exchange rates changed. The Entries keep their identity
 * until they change; see `selectEntriesByTransaction`.
 */
export function selectTransactionAmounts(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, number> {
  const transactions = snapshot.tables.transactions;
  const entriesByTransaction = selectEntriesByTransaction(snapshot);
  const amountOf = amountOfFor(snapshot);
  const inputs = [transactions, entriesByTransaction, amountOf];
  if (last?.inputs.every((input, at) => input === inputs[at])) {
    return last.amounts;
  }
  const amounts = new Map<string, number>();
  const nextById = new Map<string, CachedAmount>();
  for (const row of transactions.values()) {
    if (row.deletedAt !== null) continue;
    if (row.kind !== "expense" && row.kind !== "income") continue;
    const entries = entriesByTransaction.get(row.id) ?? NO_ENTRIES;
    let cached = cachedById.get(row.id);
    if (
      cached?.row !== row ||
      cached.entries !== entries ||
      cached.amountOf !== amountOf
    ) {
      cached = { row, entries, amountOf, amount: amountOf(row, entries) };
    }
    nextById.set(row.id, cached);
    amounts.set(row.id, cached.amount);
  }
  cachedById = nextById;
  last = { inputs, amounts };
  return amounts;
}
