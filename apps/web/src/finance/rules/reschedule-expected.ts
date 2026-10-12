import { nextOccurrence, type RuleSchedule } from "./next-occurrence.ts";

interface RuleTransaction {
  id: string;
  date: string;
  status: "posted" | "expected";
  deletedAt: unknown;
}

function isOccurrence(schedule: RuleSchedule, day: string) {
  return nextOccurrence(schedule, day) === day;
}

/**
 * What a schedule change does to a Rule's Transactions from today on, so
 * that its Expected ones match the new schedule and Materialise adds no
 * second one next to them. A live Expected one off the new schedule is
 * deleted. A deleted Expected one on the new schedule but not the old one is
 * restored, because an earlier schedule change deleted it, unless a live
 * Transaction of the Rule already has its day. A skipped one is on the old
 * schedule, so it stays skipped.
 */
export function rescheduleExpected<Row extends RuleTransaction>(
  before: RuleSchedule,
  after: RuleSchedule,
  rows: readonly Row[],
) {
  const remove: Row[] = [];
  const restore: Row[] = [];
  const liveDays = new Set<string>();
  for (const row of rows) {
    if (row.deletedAt !== null) continue;
    if (row.status === "expected" && !isOccurrence(after, row.date)) {
      remove.push(row);
    } else {
      liveDays.add(row.date);
    }
  }
  const deleted = rows
    .filter((row) => row.deletedAt !== null && row.status === "expected")
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const row of deleted) {
    if (
      !liveDays.has(row.date) &&
      isOccurrence(after, row.date) &&
      !isOccurrence(before, row.date)
    ) {
      restore.push(row);
      liveDays.add(row.date);
    }
  }
  return { remove, restore };
}
