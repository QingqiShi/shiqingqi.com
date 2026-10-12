import { describe, expect, it } from "vitest";
import type { TransactionSearch } from "../db/repositories/transaction-search-repository.ts";
import { labelBankRows } from "./label-bank-rows.ts";
import {
  createLabellingModel,
  type ModelAnswer,
} from "./testing/create-labelling-model.ts";
import type { LabellingContext, RowToLabel } from "./types.ts";

const ids = {
  current: "00000000-0000-4000-8000-0000000000a1",
  savings: "00000000-0000-4000-8000-0000000000a2",
  loan: "00000000-0000-4000-8000-0000000000a3",
  inTransit: "00000000-0000-4000-8000-0000000000a4",
  food: "00000000-0000-4000-8000-0000000000c1",
  groceries: "00000000-0000-4000-8000-0000000000c2",
  salary: "00000000-0000-4000-8000-0000000000c3",
  tag: "00000000-0000-4000-8000-0000000000d1",
  member: "00000000-0000-4000-8000-0000000000e1",
  payee: "00000000-0000-4000-8000-0000000000f1",
};

const account = {
  institution: "",
  ownerMemberId: null,
  linked: true,
  closed: false,
  isSystem: false,
  defaultPaymentAccountId: null,
  paymentDueDay: null,
};

const context: LabellingContext = {
  baseCurrency: "GBP",
  instructions: "Payments to J SMITH are rent.",
  accounts: [
    {
      ...account,
      id: ids.current,
      name: "Current",
      kind: "cash",
      currency: "GBP",
    },
    {
      ...account,
      id: ids.savings,
      name: "Savings",
      kind: "cash",
      currency: "GBP",
    },
    {
      ...account,
      id: ids.loan,
      name: "Mortgage",
      kind: "loan",
      currency: "GBP",
    },
    {
      ...account,
      id: ids.inTransit,
      name: "In transit",
      kind: "cash",
      currency: "GBP",
      isSystem: true,
    },
  ],
  categories: [
    {
      id: ids.food,
      parentId: null,
      kind: "expense",
      name: "Food",
      isSystem: false,
    },
    {
      id: ids.groceries,
      parentId: ids.food,
      kind: "expense",
      name: "Groceries",
      isSystem: false,
    },
    {
      id: ids.salary,
      parentId: null,
      kind: "income",
      name: "Salary",
      isSystem: false,
    },
  ],
  tags: [{ id: ids.tag, name: "Train" }],
  members: [{ id: ids.member, name: "Alex" }],
  payees: [{ id: ids.payee, name: "Tesco", defaultCategoryId: ids.groceries }],
};

function row(
  ref: string,
  amountMinor: number,
  description: string,
): RowToLabel {
  return {
    ref,
    date: "2026-10-05",
    amountMinor,
    accountId: ids.current,
    merchant: "",
    description,
  };
}

const noSearch = () => Promise.resolve([]);

describe("labelBankRows", () => {
  it("sends the instructions and the Household's lists, and runs the search tool", async () => {
    const searches: TransactionSearch[] = [];
    const model = createLabellingModel(
      () => ({ categoryId: ids.groceries, payeeId: ids.payee }),
      { search: { text: "tesco", limit: 5 } },
    );

    const results = await labelBankRows(
      model,
      context,
      [row("1", -1234, "TESCO STORES")],
      (search) => {
        searches.push(search);
        return Promise.resolve([
          {
            id: "t",
            date: "2026-09-01",
            kind: "expense",
            entries: [
              {
                accountId: ids.current,
                accountName: "Current",
                amountMinor: -800,
                currency: "GBP",
              },
            ],
            bankTexts: ["TESCO EXPRESS"],
            payeeId: ids.payee,
            payeeName: "Tesco",
            categoryId: ids.groceries,
            tagNames: [],
            memberName: null,
            note: "",
          },
        ]);
      },
    );

    expect(searches).toEqual([{ text: "tesco", limit: 5 }]);
    expect(model.doGenerateCalls).toHaveLength(2);
    const [first, second] = model.doGenerateCalls;
    const system = JSON.stringify(first.prompt[0]);
    expect(system).toContain("Payments to J SMITH are rent.");
    expect(system).toContain("Food > Groceries");
    expect(system).not.toContain(ids.inTransit);
    expect(JSON.stringify(second.prompt)).toContain("TESCO EXPRESS");
    expect(JSON.stringify(second.prompt)).toContain("Food > Groceries");
    expect(results.get("1")).toMatchObject({
      ok: true,
      label: {
        kind: "expense",
        categoryId: ids.groceries,
        payee: { id: ids.payee },
        transfer: null,
      },
    });
  });

  it("returns a problem for an answer that does not fit, and for a row without one", async () => {
    const answers: Record<string, ModelAnswer | null> = {
      "WRONG KIND": { categoryId: ids.salary },
      "UNKNOWN TAG": { categoryId: ids.groceries, tagIds: ["nope"] },
      "OWN ACCOUNT": { kind: "transfer", transferAccountId: ids.current },
      "IN TRANSIT": { kind: "transfer", transferAccountId: ids.inTransit },
      "TWO SIDES": {
        kind: "transfer",
        transferAccountId: ids.savings,
        transferUnknown: true,
      },
      "NOT A LOAN": {
        categoryId: ids.groceries,
        paysDownAccountId: ids.savings,
      },
      "PAIR ON ONE ACCOUNT": { kind: "transfer", pairRef: "8" },
      "SAME WAY": { categoryId: ids.groceries },
      SILENT: null,
      "MONEY OUT INCOME": { kind: "income", categoryId: ids.salary },
    };
    const rows = Object.keys(answers).map((text, index) =>
      row(String(index + 1), -100, text),
    );
    const model = createLabellingModel((prompt) => answers[prompt.description]);

    const results = await labelBankRows(model, context, rows, noSearch);

    expect(
      rows.map((input) => {
        const result = results.get(input.ref);
        return result?.ok ? "ok" : result?.problem;
      }),
    ).toEqual([
      "The category is of another kind",
      "Unknown tag",
      "A transfer to its own account",
      "Unknown transfer account",
      "A transfer needs exactly one other side",
      "paysDownAccountId must be a loan or receivable account",
      "A pair on one account",
      "ok",
      "No answer",
      "Money out cannot be an income",
    ]);
  });
});
