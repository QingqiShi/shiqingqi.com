import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { nextOccurrence } from "../rules/next-occurrence.ts";
import type { MutationInput } from "../sync/mutation-schema.ts";
import type { AccountRow, RuleRow } from "../sync/row-schemas.ts";

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
  startsOn: string;
  endsOn: string | null;
  autoPost: boolean;
  today: string;
}

interface NewRuleContext {
  accountById: ReadonlyMap<string, AccountRow>;
  baseCurrency: string;
  fx: FxIndex;
}

/**
 * The `upsertRule` arguments for a Rule made from scratch. The first
 * Expected is on or after both the start and today, so no past occurrence
 * comes back. An expense or income in another currency counts in the base
 * currency at the start day's rate; a transfer stays in one currency.
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
  const account = context.accountById.get(input.accountId);
  if (!account) return { ok: false, error: "account" };

  let amountMinor: number;
  let entries: { accountId: string; amountMinor: number }[];
  let categoryId: string | null = null;
  if (input.kind === "transfer") {
    const to = context.accountById.get(input.toAccountId);
    if (!to) return { ok: false, error: "toAccount" };
    if (to.id === account.id) return { ok: false, error: "sameAccount" };
    if (to.currency !== account.currency) {
      return { ok: false, error: "currency" };
    }
    amountMinor = 0;
    entries = [
      { accountId: account.id, amountMinor: -input.amountMinor },
      { accountId: to.id, amountMinor: input.amountMinor },
    ];
  } else {
    if (input.categoryId === null) return { ok: false, error: "category" };
    categoryId = input.categoryId;
    const signed =
      input.kind === "expense" ? -input.amountMinor : input.amountMinor;
    entries = [{ accountId: account.id, amountMinor: signed }];
    amountMinor =
      account.currency === context.baseCurrency
        ? signed
        : Math.round(
            context.fx.toBase(
              signed,
              account.currency,
              toEpochDay(input.startsOn),
            ),
          );
  }

  const schedule = {
    unit: input.unit,
    interval: input.interval,
    dayOfMonth: input.unit === "week" ? null : input.day,
    weekday: input.unit === "week" ? input.day : null,
    monthOfYear: null,
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
        amountMinor,
        categoryId,
        payeeId: input.payeeId,
        memberId: account.ownerMemberId,
        note: "",
        entries,
        tagIds: [],
      },
    },
  };
}
