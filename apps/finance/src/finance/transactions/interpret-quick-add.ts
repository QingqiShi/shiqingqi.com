import { REVIEW_BELOW } from "../ai/review-below.ts";
import type { QuickAddGuess, QuickAddResponse } from "../ai/types.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { draftOfNew } from "../editor/draft-of-transaction.ts";
import type { EditorDraft } from "../editor/editor-draft.ts";
import {
  MARKED_FIELD_KEYS,
  MARKED_FIELDS,
  type FieldMark,
  type FieldMarks,
} from "../editor/marked-fields.ts";
import { prefillFromPayee } from "../editor/prefill-from-payee.ts";
import type { EditorData } from "../editor/use-editor-data.ts";
import { parseQuickAdd, type QuickAdd } from "./parse-quick-add.ts";
import {
  amountTextFor,
  currencyOfAccount,
  quickAddDraft,
} from "./quick-add-draft.ts";
import type { TransactionKind } from "./transaction-filters.ts";

/** What a quick-add line gives a Transaction of one kind. */
export interface QuickAddReading {
  draft: EditorDraft;
  /** The amount the text wrote, in minor units of the base currency. */
  amountMinor: number | null;
  /** The fields this reading filled. */
  marks: FieldMarks;
}

/** What a quick-add line means, for a Transaction of each kind. */
export interface QuickAddInterpretation {
  /** A new number for each new reading, so that the editor fills its fields once per reading. */
  id: number;
  /** The text it reads. */
  text: string;
  /** Who read it: the AI, or the rules of quick add. */
  via: "ai" | "rules";
  /** The rules read it because the AI could not: offline, a failure, or no model. */
  isFallback: boolean;
  /** The kind the line means. */
  kind: TransactionKind;
  /** A Member who changes the kind gets the fields of that kind from the same reading. */
  readings: Record<TransactionKind, QuickAddReading>;
}

/** What the AI answered for a line, or null when the rules read it. */
export interface QuickAddAnswer {
  id: number;
  text: string;
  reply: QuickAddResponse | null;
  /** The rules read it because the AI could not. */
  isFallback: boolean;
}

function byKind(
  reading: (kind: TransactionKind) => QuickAddReading,
): Record<TransactionKind, QuickAddReading> {
  return {
    expense: reading("expense"),
    income: reading("income"),
    transfer: reading("transfer"),
  };
}

function sameValue(a: EditorDraft[keyof EditorDraft], b: typeof a) {
  return Array.isArray(a) && Array.isArray(b) ? a.join() === b.join() : a === b;
}

function readingFromRules(data: EditorData, parsed: QuickAdd): QuickAddReading {
  const draft = quickAddDraft(data, parsed);
  const base = draftOfNew(data, draft.kind);
  const marks: FieldMarks = {};
  for (const field of MARKED_FIELDS) {
    if (field === "kind") continue;
    const changed = MARKED_FIELD_KEYS[field].some(
      (key) => !sameValue(draft[key], base[key]),
    );
    if (changed) {
      marks[field] = { source: "rules", unsure: field !== "amount" };
    }
  }
  return { draft, amountMinor: parsed.amountMinor, marks };
}

/**
 * The line read by the rules of quick add. Each field the rules fill is
 * unsure, except the amount, which the text writes.
 */
function interpretWithRules(
  data: EditorData,
  { id, text, isFallback }: QuickAddAnswer,
): QuickAddInterpretation | null {
  const parsed = parseQuickAdd(text, data.baseCurrency);
  if (!parsed) return null;
  const native = readingFromRules(data, parsed);
  const kind = native.draft.kind;
  if (kind !== "expense" || parsed.kindIsExplicit) {
    native.marks.kind = { source: "rules", unsure: true };
  }
  const words = parsed.kind === "transfer" ? parsed.toText : parsed.text;
  const readings = byKind((other) => {
    if (other === kind) return native;
    return readingFromRules(
      data,
      other === "transfer"
        ? { ...parsed, kind: other, text: "", toText: words, accountText: "" }
        : { ...parsed, kind: other, kindIsExplicit: true, text: words },
    );
  });
  return { id, text, via: "rules", isFallback, kind, readings };
}

function markOf<Value>(
  guess: QuickAddGuess<Value>,
  runnerUp?: (value: Value) => string | undefined,
): FieldMark {
  const next =
    guess.runnerUp === undefined ? undefined : runnerUp?.(guess.runnerUp);
  return {
    source: "ai",
    unsure: guess.probability < REVIEW_BELOW,
    ...(next === undefined ? {} : { runnerUp: next }),
  };
}

function readingFromAi(
  data: EditorData,
  reply: QuickAddResponse,
  kind: TransactionKind,
): QuickAddReading {
  const draft = draftOfNew(data, kind);
  const marks: FieldMarks = {};
  const isUsable = (id: string | null): id is string =>
    id !== null && data.openAccounts.some((account) => account.id === id);
  const isActiveMember = (id: string | null): id is string =>
    id !== null && data.members.some((member) => member.id === id);
  const keep = (value: string) => value;
  const only =
    (isKnown: (id: string) => boolean) =>
    (id: string | null): string | undefined =>
      id !== null && isKnown(id) ? id : undefined;

  draft.date = reply.date.value;
  if (reply.date.value !== data.today || reply.date.probability < 1) {
    marks.date = markOf(reply.date, keep);
  }

  const account = kind === "transfer" ? reply.fromAccountId : reply.accountId;
  if (account && isUsable(account.value)) {
    draft.accountId = account.value;
    marks.account = markOf(account, only(isUsable));
    const owner = data.lookups.accountById.get(account.value)?.ownerMemberId;
    draft.memberId = isActiveMember(owner ?? null)
      ? (owner ?? null)
      : data.memberId;
  }

  const member = reply.memberId;
  if (member && isActiveMember(member.value)) {
    draft.memberId = member.value;
    marks.member = markOf(member, only(isActiveMember));
  }

  const tagIds = reply.tagIds.filter((id) =>
    data.tags.some((tag) => tag.id === id),
  );
  if (tagIds.length > 0) {
    draft.tagIds = tagIds;
    marks.tags = { source: "ai", unsure: false };
  }

  const currency = currencyOfAccount(data, draft.accountId);
  const amountMinor = reply.amountMinor?.value ?? null;
  if (reply.amountMinor) {
    draft.amountText = amountTextFor(
      reply.amountMinor.value,
      data.baseCurrency,
      currency,
    );
    marks.amount = markOf(reply.amountMinor, (minor) =>
      amountTextFor(minor, data.baseCurrency, currency),
    );
  }

  if (kind === "transfer") {
    const to = reply.toAccountId;
    if (to && isUsable(to.value) && to.value !== draft.accountId) {
      draft.toAccountId = to.value;
      marks.toAccount = markOf(to, only(isUsable));
    }
    return { draft, amountMinor, marks };
  }

  const payeeName = (value: QuickAddResponse["payee"]["value"]) => {
    if (value === null) return undefined;
    if ("name" in value) return value.name;
    return data.payees.find((payee) => payee.id === value.id)?.name;
  };
  const payee = reply.payee.value;
  const known =
    payee !== null && "id" in payee
      ? data.payees.find((row) => row.id === payee.id)
      : undefined;
  if (known) {
    draft.payeeId = known.id;
    draft.payeeName = known.name;
  } else if (payee !== null && "name" in payee) {
    draft.payeeName = payee.name;
  }
  if (draft.payeeName !== "") marks.payee = markOf(reply.payee, payeeName);

  const category =
    kind === "expense" ? reply.expenseCategoryId : reply.incomeCategoryId;
  const isCategory = (id: string) =>
    data.categories.some(
      (candidate) => candidate.id === id && candidate.kind === kind,
    );
  if (category && isCategory(category.value)) {
    draft.categoryId = category.value;
    marks.category = markOf(category, only(isCategory));
  }

  const paysDown = reply.paysDownAccountId;
  if (
    kind === "expense" &&
    paysDown &&
    isUsable(paysDown.value) &&
    paysDown.value !== draft.accountId
  ) {
    const loanId = paysDown.value;
    const last = known
      ? prefillFromPayee({
          kind,
          payee: known,
          history: data.byPayee.get(known.id) ?? [],
          entriesByTransaction: data.entriesByTransaction,
          tagIdsByTransaction: data.tagIdsByTransaction,
          categoryById: data.lookups.categoryById,
          isUsableAccount: isUsable,
          isActiveMember,
        }).paysDown
      : null;
    const loanCurrency = currencyOfAccount(data, loanId);
    draft.paysDownAccountId = loanId;
    draft.paysDownAmountText =
      last?.accountId === loanId
        ? minorUnitsToDecimalString(last.amountMinor, loanCurrency)
        : amountMinor === null
          ? ""
          : amountTextFor(amountMinor, data.baseCurrency, loanCurrency);
    marks.paysDown = markOf(paysDown, only(isUsable));
  }

  return { draft, amountMinor, marks };
}

/**
 * What a quick-add line means, as the AI or the rules read it. Null for a
 * line the rules cannot read, such as an empty one.
 */
export function interpretQuickAdd(
  data: EditorData,
  answer: QuickAddAnswer,
): QuickAddInterpretation | null {
  const { reply } = answer;
  if (!reply) return interpretWithRules(data, answer);
  const kind = reply.kind.value;
  const readings = byKind((other) => readingFromAi(data, reply, other));
  readings[kind].marks.kind = markOf(reply.kind, (value) => value);
  return {
    id: answer.id,
    text: reply.text,
    via: "ai",
    isFallback: false,
    kind,
    readings,
  };
}
