import type { AccountKind } from "../domain/accounts/side-of-kind.ts";

export interface LabellingAccount {
  id: string;
  name: string;
  institution: string;
  kind: AccountKind;
  currency: string;
  ownerMemberId: string | null;
  /** The account has a Bank link, so its own bank rows arrive. */
  linked: boolean;
  closed: boolean;
  /** In transit: never a label the model may choose. */
  isSystem: boolean;
  defaultPaymentAccountId: string | null;
  paymentDueDay: number | null;
}

interface LabellingCategory {
  id: string;
  parentId: string | null;
  kind: "expense" | "income";
  name: string;
  isSystem: boolean;
  /** The Payees that Members put in this Category most often. */
  usualPayees: readonly string[];
}

/** What the labeller knows about a Household before it reads any bank row. */
export interface LabellingContext {
  baseCurrency: string;
  /** The Household's AI instructions, as the Members wrote them. */
  instructions: string;
  accounts: readonly LabellingAccount[];
  categories: readonly LabellingCategory[];
  tags: readonly { id: string; name: string }[];
  members: readonly { id: string; name: string }[];
  /** The most recently used first. */
  payees: readonly {
    id: string;
    name: string;
    defaultCategoryId: string | null;
  }[];
}

/** A bank row the labeller reads. */
export interface RowToLabel {
  ref: string;
  date: string;
  /** Signed, in the account's currency, with the link's sign multiplier applied. */
  amountMinor: number;
  accountId: string;
  merchant: string;
  description: string;
}

/** `POST /api/finance/ai/suggest`: what the editor knows of the Transaction. */
export interface SuggestRequest {
  /** When the Transaction came from the bank, the server reads the bank's own text. */
  transactionId?: string;
  text: string;
  /** Signed, in the account's currency: money out is negative. */
  amountMinor: number;
  date: string;
  accountId: string;
}

/** The labels the AI suggests for one Transaction. */
export interface SuggestResponse {
  kind: "expense" | "income" | "transfer";
  categoryId: string | null;
  payeeId: string | null;
  /** A Payee to create, when no known Payee fits. */
  newPayeeName: string | null;
  tagIds: string[];
  memberId: string | null;
  /** The other account of a transfer, when the AI knows it. */
  toAccountId: string | null;
  paysDownAccountId: string | null;
  reason: string;
}

/** A Transaction's labels by name, as a Member sees them. */
export interface NamedLabels {
  kind: "expense" | "income" | "transfer";
  /** The Category path, "Transport > Commute". */
  category: string | null;
  payee: string | null;
  tags: string[];
  member: string | null;
  /** The accounts of the Transaction's Entries. */
  accounts: string[];
}

/** `POST /api/finance/ai/teach`: a Member's correction of the AI's labels on one bank Transaction. */
export interface TeachRequest {
  transactionId: string;
  ai: NamedLabels;
  member: NamedLabels;
}

/** The smallest change to the AI instructions that would have given the Member's labels. */
export interface InstructionChange {
  /** The line of the instructions that `line` replaces, or null to add `line` at the end. */
  replaces: string | null;
  line: string;
}
