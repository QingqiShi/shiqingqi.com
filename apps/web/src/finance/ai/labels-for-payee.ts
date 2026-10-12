import { modeOf } from "./mode-of.ts";
import { readTagHistory } from "./read-tag-history.ts";
import type { LabelMemory } from "./types.ts";

/** How many recent Transactions of a Payee decide its usual Category. */
export const CATEGORY_HISTORY = 20;
const MEMBER_HISTORY = 10;
const STEADY_SHARE = 0.8;
const STEADY_CONFIDENCE = 0.95;
const UNSTEADY_CONFIDENCE = 0.7;

interface PayeeLabels {
  categoryId: string | null;
  tagIds: string[];
  askForTags: boolean;
  memberId?: string;
  /** 0.95 when the Category held for at least 80 % of recent Transactions, else 0.7. */
  confidence: number;
}

/**
 * The labels a known Payee usually carries: its default Category (else the
 * most common one of its last 20 Transactions), the steady Tags of its
 * Transactions with that Category (see `readTagHistory`), and the account
 * owner (else the most common Member of its last 10).
 */
export function labelsForPayee(
  payeeId: string,
  accountId: string,
  memory: Pick<LabelMemory, "payees" | "transactions" | "accounts">,
): PayeeLabels {
  const payee = memory.payees.find((candidate) => candidate.id === payeeId);
  const history = memory.transactions.filter(
    (transaction) =>
      transaction.payeeId === payeeId && transaction.kind !== "transfer",
  );
  const categorised = history
    .slice(0, CATEGORY_HISTORY)
    .flatMap((transaction) =>
      transaction.categoryId === null ? [] : [transaction.categoryId],
    );
  const categoryId = payee?.defaultCategoryId ?? modeOf(categorised) ?? null;
  const share =
    categorised.length === 0
      ? 0
      : categorised.filter((id) => id === categoryId).length /
        categorised.length;

  const tags = readTagHistory(
    history.filter((transaction) => transaction.categoryId === categoryId),
  );

  const owner = memory.accounts.find(
    (account) => account.id === accountId,
  )?.ownerMemberId;
  const memberId =
    owner ??
    modeOf(
      history
        .slice(0, MEMBER_HISTORY)
        .flatMap((transaction) =>
          transaction.memberId === null ? [] : [transaction.memberId],
        ),
    );

  return {
    categoryId,
    tagIds: tags.steady,
    askForTags: tags.askForTags,
    memberId,
    confidence: share >= STEADY_SHARE ? STEADY_CONFIDENCE : UNSTEADY_CONFIDENCE,
  };
}
