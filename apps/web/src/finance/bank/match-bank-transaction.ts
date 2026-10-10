import { daysBetween } from "../domain/dates/add-days.ts";

/** How many days a bank date may differ from ours and still match. */
export const MATCH_DAY_WINDOW = 3;

export interface MatchCandidate {
  transactionId: string;
  status: "posted" | "expected";
  date: string;
  /** The Entry amount on the linked account. */
  amountMinor: number;
  createdAt: Date;
}

type BankMatch =
  | { action: "confirm"; transactionId: string }
  | { action: "link"; transactionId: string }
  | { action: "create" };

/**
 * What to do with one new bank row. `amountMinor` already has the link's
 * sign multiplier applied. A candidate has the same signed amount and a date
 * at most three days away. An Expected one is confirmed before a posted one
 * is linked; among equals the nearest date wins, then the earliest created.
 * No candidate means a new Transaction.
 */
export function matchBankTransaction(
  bank: { date: string; amountMinor: number },
  candidates: readonly MatchCandidate[],
): BankMatch {
  const fitting = candidates
    .filter(
      (candidate) =>
        candidate.amountMinor === bank.amountMinor &&
        Math.abs(daysBetween(bank.date, candidate.date)) <= MATCH_DAY_WINDOW,
    )
    .sort(
      (a, b) =>
        Number(b.status === "expected") - Number(a.status === "expected") ||
        Math.abs(daysBetween(bank.date, a.date)) -
          Math.abs(daysBetween(bank.date, b.date)) ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.transactionId.localeCompare(b.transactionId),
    );
  const best = fitting.at(0);
  if (!best) return { action: "create" };
  return best.status === "expected"
    ? { action: "confirm", transactionId: best.transactionId }
    : { action: "link", transactionId: best.transactionId };
}
