import { toEpochDay } from "../../domain/dates/to-epoch-day.ts";

/** A refund MoneyThings kept without a link to the expense it refunds. */
export interface RefundToPlace {
  id: string;
  date: string;
  /** Positive. */
  amountMinor: number;
  accountId: string;
  payeeId: string | null;
  /** The payee name, tag names and note, as one text. */
  text: string;
}

/** A posted expense a refund could give money back on. */
export interface PossibleOriginal {
  id: string;
  date: string;
  /** Negative: the gross expense, before any refund. */
  amountMinor: number;
  /** What linked refunds already gave back: positive. */
  refundedMinor: number;
  accountId: string;
  payeeId: string | null;
  text: string;
  categoryId: string | null;
}

export interface ScoredOriginal {
  id: string;
  score: number;
}

export interface RefundGuess {
  refundId: string;
  /** Null when no expense is a plausible original. */
  original: ScoredOriginal | null;
  /** The next most likely original, for review. */
  runnerUp: ScoredOriginal | null;
  /** The original's category, or else the one the payee's history suggests. */
  categoryId: string | null;
}

/** How far back an original can be. */
const REFUND_WINDOW_DAYS = 180;
/** A refund with a payee or a note must share at least this much of it with its original. */
const SIMILAR = 0.5;
/** A refund with no payee or note needs an exact amount, on its account or within this many days. */
const NEAR_DAYS = 31;

const WEIGHT = { payee: 4, exactAmount: 3, amount: 1.5, date: 2, account: 1 };

const STOP_WORDS =
  /退款|赔款|\b(?:refund(?:s|ed)?|returns?|returned|shipping)\b/gu;

/** Latin words and Chinese character pairs, so "火车票" and "火车" share "火车". */
function tokensOf(text: string): Set<string> {
  const tokens = new Set<string>();
  const spaced = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(STOP_WORDS, " ")
    .replace(/(\p{Script=Han}+)/gu, " $1 ");
  for (const word of spaced.split(/[^\p{L}\p{N}]+/u)) {
    if (/\p{Script=Han}/u.test(word)) {
      if (word.length === 1) tokens.add(word);
      for (let i = 0; i + 1 < word.length; i++) {
        tokens.add(word.slice(i, i + 2));
      }
    } else if (word.length > 1 && !/^\p{N}+$/u.test(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

interface Described {
  payeeId: string | null;
  tokens: Set<string>;
}

/** How much of the refund's payee and note the expense shares: 0 to 1. */
function similarity(refund: Described, original: Described) {
  if (refund.payeeId !== null && refund.payeeId === original.payeeId) return 1;
  if (refund.tokens.size === 0) return 0;
  let shared = 0;
  for (const token of refund.tokens) if (original.tokens.has(token)) shared++;
  return shared / refund.tokens.size;
}

interface Pair {
  refund: RefundToPlace;
  original: PossibleOriginal;
  score: number;
  days: number;
}

function withDescription<T extends { payeeId: string | null; text: string }>(
  items: readonly T[],
) {
  return items.map((item) => ({
    item,
    described: { payeeId: item.payeeId, tokens: tokensOf(item.text) },
  }));
}

/**
 * Finds the expense each unlinked refund most likely gives money back on.
 * An original is a posted expense on or before the refund, at most
 * REFUND_WINDOW_DAYS earlier, with enough left to refund. A refund that
 * names a payee or has a note needs an original with a similar payee or
 * note; one without them needs an exact amount. The score adds a similar
 * payee, an exact (or else a close) amount, a near date and the same
 * account. The strongest pairs are assigned first, each taking from what
 * its original has left, so the result does not depend on input order.
 */
export function guessRefundOriginals(
  refunds: readonly RefundToPlace[],
  originals: readonly PossibleOriginal[],
): RefundGuess[] {
  const described = withDescription(originals);
  const pairs: Pair[] = [];
  for (const { item: refund, described: refundDescribed } of withDescription(
    refunds,
  )) {
    const refundDay = toEpochDay(refund.date);
    const hasDescription =
      refund.payeeId !== null || refundDescribed.tokens.size > 0;
    for (const { item: original, described: originalDescribed } of described) {
      const days = refundDay - toEpochDay(original.date);
      if (days < 0 || days > REFUND_WINDOW_DAYS) continue;
      const left = -original.amountMinor - original.refundedMinor;
      if (left < refund.amountMinor) continue;
      const payee = similarity(refundDescribed, originalDescribed);
      const exact = refund.amountMinor === left;
      const sameAccount = refund.accountId === original.accountId;
      const plausible = hasDescription
        ? payee >= SIMILAR
        : exact && (sameAccount || days <= NEAR_DAYS);
      if (!plausible) continue;
      const score =
        WEIGHT.payee * payee +
        (exact
          ? WEIGHT.exactAmount
          : WEIGHT.amount * (refund.amountMinor / left)) +
        WEIGHT.date * (1 - days / REFUND_WINDOW_DAYS) +
        (sameAccount ? WEIGHT.account : 0);
      pairs.push({ refund, original, score: round(score), days });
    }
  }
  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      a.days - b.days ||
      compare(a.refund.date, b.refund.date) ||
      compare(a.refund.id, b.refund.id) ||
      compare(a.original.id, b.original.id),
  );

  const left = new Map(
    originals.map((o) => [o.id, -o.amountMinor - o.refundedMinor]),
  );
  const chosen = new Map<string, Pair>();
  for (const pair of pairs) {
    if (chosen.has(pair.refund.id)) continue;
    const available = left.get(pair.original.id) ?? 0;
    if (available < pair.refund.amountMinor) continue;
    left.set(pair.original.id, available - pair.refund.amountMinor);
    chosen.set(pair.refund.id, pair);
  }

  return withDescription(refunds).map(
    ({ item: refund, described: refundDescribed }) => {
      const pick = chosen.get(refund.id);
      const runnerUp = pairs.find(
        (pair) => pair.refund === refund && pair !== pick,
      );
      return {
        refundId: refund.id,
        original: pick ? { id: pick.original.id, score: pick.score } : null,
        runnerUp: runnerUp
          ? { id: runnerUp.original.id, score: runnerUp.score }
          : null,
        categoryId: pick
          ? pick.original.categoryId
          : categoryFromHistory(refundDescribed, described),
      };
    },
  );
}

/** The category most expenses with a similar payee or note have; the latest wins a tie. */
function categoryFromHistory(
  refund: Described,
  originals: readonly { item: PossibleOriginal; described: Described }[],
) {
  const counts = new Map<string, { count: number; latest: string }>();
  for (const { item: original, described } of originals) {
    if (original.categoryId === null) continue;
    if (similarity(refund, described) < SIMILAR) continue;
    const seen = counts.get(original.categoryId);
    counts.set(original.categoryId, {
      count: (seen?.count ?? 0) + 1,
      latest: seen && seen.latest > original.date ? seen.latest : original.date,
    });
  }
  let best: string | null = null;
  let bestSeen = { count: 0, latest: "" };
  for (const [categoryId, seen] of [...counts].sort(([a], [b]) =>
    compare(a, b),
  )) {
    if (
      seen.count > bestSeen.count ||
      (seen.count === bestSeen.count && seen.latest > bestSeen.latest)
    ) {
      best = categoryId;
      bestSeen = seen;
    }
  }
  return best;
}

function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Scores are compared after rounding, so float noise cannot break a tie. */
function round(score: number) {
  return Math.round(score * 1000) / 1000;
}
