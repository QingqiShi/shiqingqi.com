/** Labels proposed for a bank text. `newPayeeName` is set when no Payee fits. */
export interface Suggestion {
  payeeId?: string;
  newPayeeName?: string;
  categoryId: string;
  tagIds: string[];
  memberId?: string;
  /** 0 to 1: how sure the pipeline is of the Category. */
  confidence: number;
  /** True when the user nearly always adds a Tag that changes from one occurrence to the next, so the Transaction goes to Review. */
  askForTags?: boolean;
  /** Where the Suggestion came from: a past bank row with the same text, a Payee alias, or the model. */
  source: "bank-text" | "alias" | "model";
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
  /** The normalised texts of the bank rows that match the Transaction. */
  bankTexts: readonly string[];
}

/** What the Household already knows, as plain rows, for every step of the labelling pipeline. */
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
  /** Posted Transactions that are not in Review, newest first. */
  transactions: readonly MemoryTransaction[];
}
