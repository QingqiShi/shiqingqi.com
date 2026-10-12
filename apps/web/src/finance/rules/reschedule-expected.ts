import { nextOccurrence, type RuleSchedule } from "./next-occurrence.ts";

interface ExpectedRow {
  id: string;
  date: string;
  deletedAt: unknown;
}

function isOccurrence(schedule: RuleSchedule, day: string) {
  return nextOccurrence(schedule, day) === day;
}

/**
 * What a schedule change does to a Rule's Expected Transactions from today
 * on, so that they match the new schedule and Materialise adds no second one
 * next to them. A live one off the new schedule is deleted. A deleted one
 * on the new schedule but not the old one is restored, because an earlier
 * schedule change deleted it. A skipped one is on the old schedule, so it
 * stays skipped.
 */
export function rescheduleExpected<Row extends ExpectedRow>(
  before: RuleSchedule,
  after: RuleSchedule,
  rows: readonly Row[],
) {
  const remove: Row[] = [];
  const restore: Row[] = [];
  for (const row of rows) {
    const onAfter = isOccurrence(after, row.date);
    if (row.deletedAt === null) {
      if (!onAfter) remove.push(row);
    } else if (onAfter && !isOccurrence(before, row.date)) {
      restore.push(row);
    }
  }
  return { remove, restore };
}
