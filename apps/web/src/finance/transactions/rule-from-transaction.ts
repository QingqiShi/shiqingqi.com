import { addDays } from "../domain/dates/add-days.ts";
import { parseDay } from "../domain/dates/to-epoch-day.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import type { MutationInput } from "../sync/mutation-schema.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import type { RecurringPattern } from "./detect-recurring.ts";

type UpsertRuleArgs = Extract<MutationInput, { name: "upsertRule" }>["args"];

interface RuleFromTransactionInput {
  ruleId: string;
  name: string;
  transaction: TransactionRow;
  entries: readonly EntryRow[];
  tagIds: readonly string[];
  /** A detected schedule; without one the Rule repeats monthly on the Transaction's day. */
  pattern: RecurringPattern | null;
  today: string;
}

/**
 * The `upsertRule` arguments for "Make this a rule": the Transaction as the
 * template, starting from the first occurrence after today so no past
 * occurrence comes back as Expected.
 */
export function ruleFromTransaction(
  input: RuleFromTransactionInput,
): UpsertRuleArgs {
  const { transaction } = input;
  const day = parseDay(transaction.date);
  const schedule = input.pattern ?? {
    unit: "month" as const,
    interval: 1 as const,
    dayOfMonth: day.dayOfMonth,
    weekday: null,
    monthOfYear: null,
  };
  const startsOn = nextOccurrence(
    { ...schedule, startsOn: transaction.date, endsOn: null },
    addDays(input.today, 1),
  );
  return {
    id: input.ruleId,
    name: input.name,
    unit: schedule.unit,
    interval: schedule.interval,
    dayOfMonth: schedule.dayOfMonth,
    weekday: schedule.weekday,
    monthOfYear: schedule.monthOfYear,
    startsOn,
    nextOn: startsOn,
    autoPost: false,
    paused: false,
    template: {
      kind: transaction.kind,
      amountMinor: transaction.amountMinor,
      categoryId: transaction.categoryId,
      payeeId: transaction.payeeId,
      memberId: transaction.memberId,
      note: transaction.note,
      entries: input.entries.map((entry) => ({
        accountId: entry.accountId,
        amountMinor: entry.amountMinor,
      })),
      tagIds: [...input.tagIds],
    },
  };
}
