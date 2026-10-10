import { describe, expect, it } from "vitest";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { buildNewRule, type NewRuleInput } from "./build-new-rule.ts";

const NOW = "2026-10-01T09:00:00.000Z";

function account(id: string, currency: string): AccountRow {
  return {
    id,
    householdId: "h",
    groupId: "g",
    ownerMemberId: "alex",
    name: id,
    institution: "",
    kind: "cash",
    currency,
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

const context = {
  accountById: new Map([
    ["current", account("current", "GBP")],
    ["savings", account("savings", "GBP")],
    ["us", account("us", "USD")],
  ]),
  baseCurrency: "GBP",
  fx: createFxIndex(
    [{ base: "USD", quote: "GBP", on: "2026-01-01", rate: 0.8 }],
    "GBP",
  ),
};

const input: NewRuleInput = {
  id: "rule",
  name: "Netflix",
  kind: "expense",
  amountMinor: 1099,
  accountId: "current",
  toAccountId: "",
  payeeId: "netflix",
  categoryId: "fun",
  unit: "month",
  interval: 1,
  day: 15,
  startsOn: "2026-01-01",
  endsOn: null,
  autoPost: false,
  today: "2026-10-10",
};

describe("buildNewRule", () => {
  it("makes a monthly expense whose first Expected is not in the past", () => {
    const result = buildNewRule(input, context);
    expect(result).toEqual({
      ok: true,
      args: {
        id: "rule",
        name: "Netflix",
        unit: "month",
        interval: 1,
        dayOfMonth: 15,
        weekday: null,
        monthOfYear: null,
        startsOn: "2026-01-01",
        endsOn: null,
        nextOn: "2026-10-15",
        autoPost: false,
        paused: false,
        template: {
          kind: "expense",
          amountMinor: -1099,
          categoryId: "fun",
          payeeId: "netflix",
          memberId: "alex",
          note: "",
          entries: [{ accountId: "current", amountMinor: -1099 }],
          tagIds: [],
        },
      },
    });
  });

  it("counts a foreign-currency income in the base currency", () => {
    const result = buildNewRule(
      { ...input, kind: "income", accountId: "us", amountMinor: 10_000 },
      context,
    );
    expect(result.ok && result.args.template).toMatchObject({
      amountMinor: 8000,
      entries: [{ accountId: "us", amountMinor: 10_000 }],
    });
  });

  it("makes a weekly transfer with no category and no stats amount", () => {
    const result = buildNewRule(
      {
        ...input,
        kind: "transfer",
        toAccountId: "savings",
        unit: "week",
        day: 5,
        startsOn: "2026-10-20",
      },
      context,
    );
    expect(result.ok && result.args).toMatchObject({
      weekday: 5,
      dayOfMonth: null,
      nextOn: "2026-10-23",
      template: {
        kind: "transfer",
        amountMinor: 0,
        categoryId: null,
        entries: [
          { accountId: "current", amountMinor: -1099 },
          { accountId: "savings", amountMinor: 1099 },
        ],
      },
    });
  });

  it("says what is missing", () => {
    expect(buildNewRule({ ...input, accountId: "" }, context)).toEqual({
      ok: false,
      error: "account",
    });
    expect(buildNewRule({ ...input, categoryId: null }, context)).toEqual({
      ok: false,
      error: "category",
    });
    const transfer = { ...input, kind: "transfer" as const };
    expect(
      buildNewRule({ ...transfer, toAccountId: "current" }, context),
    ).toEqual({ ok: false, error: "sameAccount" });
    expect(buildNewRule({ ...transfer, toAccountId: "us" }, context)).toEqual({
      ok: false,
      error: "currency",
    });
  });
});
