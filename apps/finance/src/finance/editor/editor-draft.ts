import type { TransactionKind } from "../transactions/transaction-filters.ts";

/** What the editor form holds; amounts are the text the person typed. */
export interface EditorDraft {
  kind: TransactionKind;
  /** The amount in major units, without a sign; the kind gives the sign. */
  amountText: string;
  /** A transfer between currencies: the amount that arrives, in the target account's currency. */
  toAmountText: string;
  payeeName: string;
  /** The Payee picked in the combobox; null for a new name or none. */
  payeeId: string | null;
  categoryId: string | null;
  /** The account of an expense or income, or the source of a transfer. */
  accountId: string | null;
  toAccountId: string | null;
  date: string;
  memberId: string | null;
  tagIds: readonly string[];
  note: string;
  /** An expense that gives money back. */
  refund: boolean;
  refundOfId: string | null;
  /**
   * The second Entry of an expense or income on a loan, card or receivable,
   * such as the part of a mortgage payment that pays the loan down. Null
   * for none.
   */
  paysDownAccountId: string | null;
  /** That Entry's amount, without a sign: it moves against the main Entry. */
  paysDownAmountText: string;
}

export type EditorField =
  | "amount"
  | "toAmount"
  | "account"
  | "toAccount"
  | "category"
  | "payee"
  | "paysDown"
  | "paysDownAmount";

export type EditorError =
  | "amountMissing"
  | "amountUnreadable"
  | "accountMissing"
  | "toAccountMissing"
  | "sameAccount"
  | "categoryMissing";

/** Creates an empty draft for a new Transaction on `date`. */
export function editorDraft(
  kind: TransactionKind,
  date: string,
  fields: Partial<EditorDraft> = {},
): EditorDraft {
  return {
    kind,
    amountText: "",
    toAmountText: "",
    payeeName: "",
    payeeId: null,
    categoryId: null,
    accountId: null,
    toAccountId: null,
    date,
    memberId: null,
    tagIds: [],
    note: "",
    refund: false,
    refundOfId: null,
    paysDownAccountId: null,
    paysDownAmountText: "",
    ...fields,
  };
}
