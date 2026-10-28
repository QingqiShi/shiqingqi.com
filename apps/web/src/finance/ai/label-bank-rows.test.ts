import { describe, expect, it } from "vitest";
import { labelBankRows } from "./label-bank-rows.ts";
import { pairLabel } from "./row-questions.ts";
import {
  createFailingLabellingModel,
  createLabellingModel,
  offeredLabels,
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
  partner: "00000000-0000-4000-8000-0000000000e2",
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
      usualPayees: [],
    },
    {
      id: ids.groceries,
      parentId: ids.food,
      kind: "expense",
      name: "Groceries",
      isSystem: false,
      usualPayees: ["Tesco"],
    },
    {
      id: ids.salary,
      parentId: null,
      kind: "income",
      name: "Salary",
      isSystem: false,
      usualPayees: [],
    },
  ],
  tags: [{ id: ids.tag, name: "Train" }],
  members: [
    { id: ids.member, name: "Alex" },
    { id: ids.partner, name: "Sam" },
  ],
  payees: [{ id: ids.payee, name: "Tesco", defaultCategoryId: ids.groceries }],
};

function row(
  ref: string,
  amountMinor: number,
  description: string,
  accountId = ids.current,
): RowToLabel {
  return {
    ref,
    date: "2026-10-05",
    amountMinor,
    accountId,
    merchant: "",
    description,
  };
}

function requestFor(
  model: ReturnType<typeof createLabellingModel>,
  description: string,
) {
  const request = model.requests.find(
    (each) => each.state.bank_row.description === description,
  );
  if (!request) throw new Error(`No request for ${description}`);
  return request;
}

function labelsOf(
  answers: Record<string, ModelAnswer | null>,
  rows: readonly RowToLabel[],
) {
  const model = createLabellingModel(
    (prompt) => answers[prompt.description] ?? null,
  );
  return {
    model,
    results: labelBankRows(model, context, rows, noSearch),
  };
}

const noSearch = () => Promise.resolve([]);

describe("labelBankRows", () => {
  it("reads a transfer to a known account, to the other side in the batch, or to an unknown account", async () => {
    const rows = [
      row("1", -5_000, "TO SAVINGS"),
      row("2", -7_000, "PAIR OUT"),
      row("3", 7_000, "PAIR IN", ids.savings),
      row("4", -9_000, "SOMEWHERE"),
    ];
    const { model, results } = labelsOf(
      {
        "TO SAVINGS": { kind: "transfer", transfer: "Savings" },
        "PAIR OUT": {
          kind: "transfer",
          transfer: pairLabel("Savings", "2026-10-05"),
        },
        "PAIR IN": { kind: "transfer", transfer: "Current" },
        SOMEWHERE: { kind: "transfer", transfer: "unknown" },
      },
      rows,
    );

    const labelled = await results;
    const transfers = rows.map(({ ref }) => {
      const result = labelled.get(ref);
      return result?.ok ? result.label.transfer : result?.problem;
    });
    expect(transfers).toEqual([
      { type: "account", accountId: ids.savings },
      { type: "pair", ref: "3" },
      { type: "pair", ref: "2" },
      { type: "unknown" },
    ]);
    const offered = offeredLabels(
      requestFor(model, "PAIR OUT").questions.transfer,
    );
    expect(offered).toEqual([
      "bank row on Savings, 2026-10-05",
      "Savings",
      "Mortgage",
      "unknown account",
    ]);
  });

  it("puts a row in Review, with what Jev was unsure of, when an answer it uses is unlikely", async () => {
    const { results } = labelsOf(
      {
        "ODD SHOP": { category: "Groceries", payee: "Odd", probability: 0.4 },
      },
      [row("1", -100, "ODD SHOP")],
    );

    const result = (await results).get("1");
    expect(result).toMatchObject({ ok: true, label: { needsReview: true } });
    expect(result?.ok && result.label.reason).toMatch(
      /^Unsure of the kind: expense 40%, transfer 60%; Unsure of the category: Food > Groceries 40%, Food 60%/,
    );
  });

  it("returns a problem for an answer it cannot read, and throws when the request fails", async () => {
    const { results } = labelsOf({}, [row("1", -100, "SILENT")]);

    expect((await results).get("1")).toEqual({
      ok: false,
      problem: "Unknown kind answer",
    });
    await expect(
      labelBankRows(
        createFailingLabellingModel(),
        context,
        [row("1", -100, "X")],
        noSearch,
      ),
    ).rejects.toThrow();
  });
});
