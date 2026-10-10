/** Labels proposed for a bank text. `newPayeeName` is set when no Payee fits. */
export interface Suggestion {
  payeeId?: string;
  newPayeeName?: string;
  categoryId: string;
  tagIds: string[];
  memberId?: string;
  /** 0 to 1: how sure the pipeline is of the Category. */
  confidence: number;
  /** Where the Suggestion came from: a Payee alias, a near Payee name, or the model. */
  source: "alias" | "history" | "model";
}

export interface LabelInput {
  text: string;
  /** Signed, in the account's currency: money out is negative. */
  amountMinor: number;
  date: string;
  accountId: string;
}

export interface MemoryTransaction {
  id: string;
  date: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  payeeId: string | null;
  categoryId: string | null;
  memberId: string | null;
  tagIds: readonly string[];
  accountIds: readonly string[];
}

/**
 * What the Household already knows, as plain rows, so the alias and history
 * steps run the same on the server and on the Replica.
 */
export interface LabelMemory {
  /** The currency of `transactions[].amountMinor`. */
  baseCurrency: string;
  aliases: readonly { alias: string; payeeId: string }[];
  payees: readonly {
    id: string;
    name: string;
    defaultCategoryId: string | null;
  }[];
  categories: readonly {
    id: string;
    parentId: string | null;
    kind: "expense" | "income";
    name: string;
  }[];
  tags: readonly { id: string; name: string }[];
  members: readonly { id: string; name: string }[];
  accounts: readonly {
    id: string;
    name: string;
    kind: string;
    currency: string;
    ownerMemberId: string | null;
  }[];
  /** Posted Transactions, newest first. */
  transactions: readonly MemoryTransaction[];
}
