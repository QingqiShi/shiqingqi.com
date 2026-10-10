import { daysBetween } from "../domain/dates/add-days.ts";
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import { parseDay } from "../domain/dates/to-epoch-day.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";

/** How many earlier Transactions must repeat the pattern. */
const PRIOR_NEEDED = 3;
const AMOUNT_TOLERANCE = 0.05;

const CADENCES = [
  { unit: "week", days: 7, slack: 1 },
  { unit: "month", days: 30, slack: 3 },
  { unit: "year", days: 365, slack: 7 },
] as const;

export interface RecurringPattern {
  unit: "week" | "month" | "year";
  interval: 1;
  dayOfMonth: number | null;
  weekday: number | null;
  monthOfYear: number | null;
  /** The Transaction the pattern was found from; its date anchors the schedule. */
  anchorDate: string;
}

type Candidate = Pick<
  TransactionRow,
  "id" | "date" | "amountMinor" | "kind" | "status" | "deletedAt"
>;

function isNear(amount: number, target: number) {
  if (target === 0) return amount === 0;
  return Math.abs(amount - target) <= Math.abs(target) * AMOUNT_TOLERANCE;
}

/**
 * Finds a schedule in a Payee's history: the Transaction and at least three
 * Transactions before it with near-equal amounts (± 5 %) and the same gap
 * each time — 7 ± 1, 30 ± 3 or 365 ± 7 days. `history` is the Payee's
 * Transactions, newest first. Null when there is no such pattern.
 */
export function detectRecurring(
  transaction: Candidate,
  history: readonly Candidate[],
): RecurringPattern | null {
  if (transaction.kind === "transfer") return null;
  const earlier = history
    .filter(
      (row) =>
        row.id !== transaction.id &&
        row.deletedAt === null &&
        row.status === "posted" &&
        row.kind === transaction.kind &&
        row.date < transaction.date &&
        isNear(row.amountMinor, transaction.amountMinor),
    )
    .slice(0, PRIOR_NEEDED);
  if (earlier.length < PRIOR_NEEDED) return null;

  const dates = [transaction.date, ...earlier.map((row) => row.date)];
  const gaps = dates
    .slice(1)
    .map((date, index) => daysBetween(date, dates[index]));
  const cadence = CADENCES.find((candidate) =>
    gaps.every((gap) => Math.abs(gap - candidate.days) <= candidate.slack),
  );
  if (!cadence) return null;

  const day = parseDay(transaction.date);
  return {
    unit: cadence.unit,
    interval: 1,
    dayOfMonth: cadence.unit === "week" ? null : day.dayOfMonth,
    weekday: cadence.unit === "week" ? weekdayOf(transaction.date) : null,
    monthOfYear: cadence.unit === "year" ? day.month : null,
    anchorDate: transaction.date,
  };
}
