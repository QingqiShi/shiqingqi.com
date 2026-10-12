import type { MemoryTransaction } from "./types.ts";

/** How many recent Transactions of one bank text or Payee, with one Category, show which Tags hold. */
const TAG_HISTORY = 10;
const MIN_STEADY_HISTORY = 2;
const MIN_ASK_HISTORY = 3;
const ASK_SHARE = 0.8;

export interface TagHistory {
  /** Tags on every one of the recent Transactions, when there are at least two. */
  steady: string[];
  /** Tags on some of the recent Transactions but not on all: they change from one occurrence to the next. */
  varying: ReadonlySet<string>;
  /** True when at least 80 % of three or more recent Transactions carry a varying Tag, which only the user can give. */
  askForTags: boolean;
}

/**
 * What the Tags of past Transactions of one bank text or Payee, with one
 * Category, say about the next one. `history` is newest first. Only a Tag on
 * every recent Transaction is steady, because a wrong Tag is worse than a
 * missing one: the restaurant of a delivery order is never steady.
 */
export function readTagHistory(
  history: readonly MemoryTransaction[],
): TagHistory {
  const recent = history.slice(0, TAG_HISTORY);
  const counts = new Map<string, number>();
  for (const transaction of recent) {
    for (const tagId of new Set(transaction.tagIds)) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }
  const everywhere = new Set(
    [...counts].flatMap(([tagId, count]) =>
      count === recent.length ? [tagId] : [],
    ),
  );
  const varying = new Set(
    recent.length < MIN_STEADY_HISTORY
      ? []
      : [...counts.keys()].filter((tagId) => !everywhere.has(tagId)),
  );
  const withVarying = recent.filter((transaction) =>
    transaction.tagIds.some((tagId) => varying.has(tagId)),
  ).length;
  return {
    steady: recent.length < MIN_STEADY_HISTORY ? [] : [...everywhere].sort(),
    varying,
    askForTags:
      recent.length >= MIN_ASK_HISTORY &&
      withVarying / recent.length >= ASK_SHARE,
  };
}
