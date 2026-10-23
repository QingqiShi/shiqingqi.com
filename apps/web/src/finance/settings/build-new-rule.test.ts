import { describe, expect, it } from "vitest";
import { testAccount } from "../transactions/testing/create-test-replica.ts";
import { buildNewRule, type NewRuleInput } from "./build-new-rule.ts";

function account(id: string, currency: string) {
  return testAccount(id, { ownerMemberId: "alex", currency });
}

const context = {
  accountById: new Map([
    ["current", account("current", "GBP")],
    ["savings", account("savings", "GBP")],
    ["us", account("us", "USD")],
  ]),
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
  nonBusinessDay: "stay",
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
        nonBusinessDay: "stay",
        startsOn: "2026-01-01",
        endsOn: null,
        nextOn: "2026-10-15",
        autoPost: false,
        paused: false,
        template: {
          kind: "expense",
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

  it("moves the first Expected off a weekend or a bank holiday", () => {
    const mortgage = { ...input, day: 1, nonBusinessDay: "next" as const };
    expect(
      buildNewRule({ ...mortgage, today: "2026-10-02" }, context),
    ).toMatchObject({
      ok: true,
      args: { nonBusinessDay: "next", nextOn: "2026-11-02" },
    });
    const salary = { ...input, day: 25, nonBusinessDay: "previous" as const };
    expect(
      buildNewRule({ ...salary, today: "2026-10-12" }, context),
    ).toMatchObject({ ok: true, args: { nextOn: "2026-10-23" } });
  });

  it("keeps a foreign-currency income in its account's currency", () => {
    const result = buildNewRule(
      { ...input, kind: "income", accountId: "us", amountMinor: 10_000 },
      context,
    );
    expect(result.ok && result.args.template).toEqual(
      expect.objectContaining({
        entries: [{ accountId: "us", amountMinor: 10_000 }],
      }),
    );
    expect(result.ok && result.args.template).not.toHaveProperty("amountMinor");
  });

  it("makes a weekly transfer with no category", () => {
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
