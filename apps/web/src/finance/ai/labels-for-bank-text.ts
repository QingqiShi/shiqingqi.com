import { modeOf } from "./mode-of.ts";
import { normaliseBankText } from "./normalise-bank-text.ts";
import { readTagHistory } from "./read-tag-history.ts";
import type {
  LabelInput,
  LabelMemory,
  MemoryTransaction,
  Suggestion,
} from "./types.ts";

/** How many recent Transactions with the same bank text must agree on the Category. */
const CATEGORY_HISTORY = 20;
/** How many recent Transactions with the same bank text decide the Payee. */
const PAYEE_HISTORY = 5;
const STEADY_CONFIDENCE = 0.95;
const UNSTEADY_CONFIDENCE = 0.7;

type RecallMemory = Pick<LabelMemory, "transactions" | "accounts">;

const indexByTransactions = new WeakMap<
  RecallMemory["transactions"],
  Map<string, MemoryTransaction[]>
>();

/** The labelled Transactions of each normalised bank text, newest first, built once for each memory. */
function indexOf(memory: Pick<LabelMemory, "transactions">) {
  const cached = indexByTransactions.get(memory.transactions);
  if (cached) return cached;
  const index = new Map<string, MemoryTransaction[]>();
  for (const transaction of memory.transactions) {
    if (transaction.kind === "transfer" || transaction.categoryId === null) {
      continue;
    }
    for (const text of new Set(transaction.bankTexts)) {
      const list = index.get(text);
      if (list) list.push(transaction);
      else index.set(text, [transaction]);
    }
  }
  indexByTransactions.set(memory.transactions, index);
  return index;
}

/** The labelled Transactions whose bank row had the same normalised text and whose amount had the same sign, newest first. */
export function bankTextHistory(
  input: Pick<LabelInput, "text" | "amountMinor">,
  memory: Pick<LabelMemory, "transactions">,
): MemoryTransaction[] {
  const text = normaliseBankText(input.text);
  if (text === "") return [];
  return (indexOf(memory).get(text) ?? []).filter(
    (transaction) =>
      Math.sign(transaction.amountMinor) === Math.sign(input.amountMinor),
  );
}

/** Of the first five of `history`, the newest one with the most common Payee, also when that is none. */
export function withUsualPayee(
  history: readonly MemoryTransaction[],
): MemoryTransaction | undefined {
  const latest = history.slice(0, PAYEE_HISTORY);
  const payeeKey = modeOf(
    latest.map((transaction) => transaction.payeeId ?? ""),
  );
  return latest.find((transaction) => (transaction.payeeId ?? "") === payeeKey);
}

export interface Recall {
  suggestion: Suggestion;
  /** False when the recent Transactions with the text disagree on the Category, so the model must decide. The Suggestion is then the fallback. */
  categoryAgrees: boolean;
}

/**
 * Step 1 of the labelling pipeline: reuses the labels of past Transactions
 * whose bank row had the same normalised text and whose amount had the same
 * sign. The Category is the one of the last 20; when they disagree, the
 * model decides, and the most common Category is only the fallback, at 0.7.
 * The Payee is the most common of the last five with that Category, the
 * newest on a tie. Only steady Tags are given (see `readTagHistory`). The
 * Member is the account owner, else the one of the newest such Transaction.
 * Null when no such Transaction exists.
 */
export function labelsForBankText(
  input: LabelInput,
  memory: RecallMemory,
): Recall | null {
  const recent = bankTextHistory(input, memory).slice(0, CATEGORY_HISTORY);
  const categoryId = modeOf(
    recent.flatMap((transaction) =>
      transaction.categoryId === null ? [] : [transaction.categoryId],
    ),
  );
  if (categoryId === undefined) return null;

  const categoryAgrees = recent.every(
    (transaction) => transaction.categoryId === categoryId,
  );
  const sameCategory = recent.filter(
    (transaction) => transaction.categoryId === categoryId,
  );
  const chosen = withUsualPayee(sameCategory);
  if (!chosen) return null;
  const tags = readTagHistory(sameCategory);
  const owner = memory.accounts.find(
    (account) => account.id === input.accountId,
  )?.ownerMemberId;
  const suggestion: Suggestion = {
    payeeId: chosen.payeeId ?? undefined,
    categoryId,
    tagIds: tags.steady,
    memberId: owner ?? chosen.memberId ?? undefined,
    confidence: categoryAgrees ? STEADY_CONFIDENCE : UNSTEADY_CONFIDENCE,
    source: "bank-text",
  };
  if (tags.askForTags) suggestion.askForTags = true;
  return { suggestion, categoryAgrees };
}
