import type { NonBusinessDay } from "../domain/dates/to-business-day.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import type { MutationInput } from "../sync/mutation-schema.ts";
import type { AccountRow, RuleRow } from "../sync/row-schemas.ts";
import { ruleTemplateMoney } from "./rule-template-money.ts";

type UpsertRuleArgs = Extract<MutationInput, { name: "upsertRule" }>["args"];

export interface NewRuleInput {
  id: string;
  name: string;
  kind: "expense" | "income" | "transfer";
  /** The size of each occurrence in the account's minor units, above 0. */
  amountMinor: number;
  accountId: string;
  /** The account a transfer moves money to. */
  toAccountId: string;
  payeeId: string | null;
  categoryId: string | null;
  unit: RuleRow["unit"];
  interval: number;
  /** The weekday (1 is Monday) or day of the month; null takes it from `startsOn`. */
  day: number | null;
  nonBusinessDay: NonBusinessDay;
  startsOn: string;
  endsOn: string | null;
  autoPost: boolean;
  today: string;
}

interface NewRuleContext {
  accountById: ReadonlyMap<string, AccountRow>;
}

/**
 * The `upsertRule` arguments for a Rule made from scratch. The first
 * Expected is on or after both the start and today, so no past occurrence
 * comes back. A transfer stays in one currency.
 */
export function buildNewRule(
  input: NewRuleInput,
  context: NewRuleContext,
):
  | { ok: true; args: UpsertRuleArgs }
  | {
      ok: false;
      error: "account" | "toAccount" | "sameAccount" | "currency" | "category";
    } {
  const money = ruleTemplateMoney(input, (id) => context.accountById.get(id));
  if (!money.ok) return money;
  const { account, toAccount } = money;
  if (toAccount && toAccount.currency !== account.currency) {
    return { ok: false, error: "currency" };
  }
  const schedule = {
    unit: input.unit,
    interval: input.interval,
    dayOfMonth: input.unit === "week" ? null : input.day,
    weekday: input.unit === "week" ? input.day : null,
    monthOfYear: null,
    nonBusinessDay: input.nonBusinessDay,
    startsOn: input.startsOn,
    endsOn: input.endsOn,
  };
  const from = input.startsOn > input.today ? input.startsOn : input.today;
  return {
    ok: true,
    args: {
      id: input.id,
      name: input.name,
      ...schedule,
      nextOn: nextOccurrence(schedule, from),
      autoPost: input.autoPost,
      paused: false,
      template: {
        kind: input.kind,
        categoryId: money.categoryId,
        payeeId: input.payeeId,
        memberId: account.ownerMemberId,
        note: "",
        entries: money.entries,
        tagIds: [],
      },
    },
  };
}
