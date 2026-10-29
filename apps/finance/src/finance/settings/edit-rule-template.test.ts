import { describe, expect, it } from "vitest";
import type { RuleTemplate } from "../rules/rule-template-schema.ts";
import { testAccount } from "../transactions/testing/create-test-replica.ts";
import { editRuleTemplate } from "./edit-rule-template.ts";

function account(id: string, currency: string, ownerMemberId: string | null) {
  return testAccount(id, { ownerMemberId, currency });
}

const accountById = new Map([
  ["current", account("current", "GBP", "alex")],
  ["card", account("card", "GBP", "sam")],
  ["savings", account("savings", "GBP", null)],
  ["us", account("us", "USD", "alex")],
]);
const isBase = (id: string) => accountById.get(id)?.currency === "GBP";
const context = { accountById, isBaseCurrency: isBase };

const expense: RuleTemplate = {
  kind: "expense",
  categoryId: "fun",
  payeeId: "netflix",
  memberId: "alex",
  note: "Family plan",
  entries: [{ accountId: "current", amountMinor: -1_099 }],
  tagIds: ["tv"],
};
const transfer: RuleTemplate = {
  ...expense,
  kind: "transfer",
  categoryId: null,
  entries: [
    { accountId: "current", amountMinor: -30_000 },
    { accountId: "savings", amountMinor: 30_000 },
  ],
};
const edit = {
  amountMinor: 1_299,
  accountId: "card",
  toAccountId: "",
  payeeId: "disney",
  categoryId: "streaming",
};

describe("editRuleTemplate", () => {
  it("moves an expense to another account, Payee and Category, and the Member follows the account", () => {
    expect(editRuleTemplate(expense, edit, context)).toEqual({
      ok: true,
      template: {
        kind: "expense",
        categoryId: "streaming",
        payeeId: "disney",
        memberId: "sam",
        note: "Family plan",
        entries: [{ accountId: "card", amountMinor: -1_299 }],
        tagIds: ["tv"],
      },
    });
  });

  it("moves a transfer between two other accounts with no Category", () => {
    const result = editRuleTemplate(
      transfer,
      { ...edit, accountId: "savings", toAccountId: "card" },
      context,
    );
    expect(result).toMatchObject({
      ok: true,
      template: {
        categoryId: null,
        entries: [
          { accountId: "savings", amountMinor: -1_299 },
          { accountId: "card", amountMinor: 1_299 },
        ],
      },
    });
  });

  it("refuses an account in another currency, one account twice, or no Category", () => {
    expect(
      editRuleTemplate(expense, { ...edit, accountId: "us" }, context),
    ).toEqual({ ok: false, error: "account" });
    expect(
      editRuleTemplate(
        transfer,
        { ...edit, accountId: "card", toAccountId: "card" },
        context,
      ),
    ).toEqual({ ok: false, error: "sameAccount" });
    expect(
      editRuleTemplate(transfer, { ...edit, toAccountId: "us" }, context),
    ).toEqual({ ok: false, error: "toAccount" });
    expect(
      editRuleTemplate(expense, { ...edit, categoryId: null }, context),
    ).toEqual({ ok: false, error: "category" });
  });
});
