import type { EditorDraft } from "./editor-draft.ts";

/** The editor fields that a reading of quick add or a Payee's last Transaction can fill, and that a Member can touch. */
export const MARKED_FIELDS = [
  "kind",
  "amount",
  "payee",
  "category",
  "account",
  "toAccount",
  "paysDown",
  "date",
  "member",
  "tags",
] as const;

export type MarkedField = (typeof MARKED_FIELDS)[number];

/** The draft fields that each marked field holds. */
export const MARKED_FIELD_KEYS = {
  kind: ["kind"],
  amount: ["amountText"],
  payee: ["payeeName", "payeeId"],
  category: ["categoryId"],
  account: ["accountId"],
  toAccount: ["toAccountId"],
  paysDown: ["paysDownAccountId", "paysDownAmountText"],
  date: ["date"],
  member: ["memberId"],
  tags: ["tagIds"],
} as const satisfies Record<MarkedField, readonly (keyof EditorDraft)[]>;

/** Where a field's value came from, and whether to check it. */
export interface FieldMark {
  source: "ai" | "rules" | "lastTime";
  /** The value is a guess the Member should check. */
  unsure: boolean;
  /**
   * The next best value, in the draft's terms: an id for a Category, an
   * account or a Member, a Payee name, an amount as text, a day, or a kind.
   */
  runnerUp?: string;
}

export type FieldMarks = Partial<Record<MarkedField, FieldMark>>;

/** A field that a save cannot do without. */
export type RequiredField = "amount" | "category" | "account" | "toAccount";

/** How a field reads to the Member: a value to trust, one to check, or a value it still needs. */
export type FieldStatus = "sure" | "unsure" | "missing";

/** The fields a save needs that `draft` leaves empty, in the order the form shows them. */
export function missingFields(draft: EditorDraft): RequiredField[] {
  const missing: RequiredField[] = [];
  if (draft.amountText.trim() === "") missing.push("amount");
  if (draft.kind === "transfer") {
    if (draft.accountId === null) missing.push("account");
    if (draft.toAccountId === null) missing.push("toAccount");
  } else {
    if (draft.categoryId === null) missing.push("category");
    if (draft.accountId === null) missing.push("account");
  }
  return missing;
}

/** The status of `field`, or null for a field that nothing filled and a save does not need. */
export function fieldStatus(
  draft: EditorDraft,
  marks: FieldMarks,
  field: MarkedField,
): FieldStatus | null {
  if (missingFields(draft).some((missing) => missing === field)) {
    return "missing";
  }
  const mark = marks[field];
  if (!mark) return null;
  return mark.unsure ? "unsure" : "sure";
}
