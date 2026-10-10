import { MutationError } from "./mutation-error.ts";

export interface TransactionShape {
  id?: string;
  kind: "expense" | "income" | "transfer";
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  refundOfId?: string | null;
  ruleId?: string | null;
  entries: readonly { accountId: string; amountMinor: number }[];
  tagIds: readonly string[];
}

function invalid(message: string): never {
  throw new MutationError("invalid", message);
}

/**
 * The rules a Transaction keeps that need no other row: it has an Entry; a
 * transfer moves money between two different accounts and has no Category;
 * an expense or income has a Category; it does not refund itself. The server
 * and the Replica both check them.
 */
export function checkTransactionShape(transaction: TransactionShape) {
  if (transaction.entries.length === 0) invalid("A transaction needs an entry");
  if (transaction.kind === "transfer") {
    if (transaction.entries.length !== 2) {
      invalid("A transfer needs exactly two entries");
    }
    if (transaction.entries[0].accountId === transaction.entries[1].accountId) {
      invalid("A transfer needs two different accounts");
    }
    if (transaction.categoryId !== null) {
      invalid("A transfer has no category");
    }
  } else if (transaction.categoryId === null) {
    invalid(`An ${transaction.kind} needs a category`);
  }
  if (transaction.refundOfId && transaction.refundOfId === transaction.id) {
    invalid("A transaction cannot refund itself");
  }
}
