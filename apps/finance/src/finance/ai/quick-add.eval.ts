import { afterAll, describe, expect, it } from "vitest";
import { categoriseFixture } from "./eval/categorise-fixture.ts";
import { meterFinanceModel } from "./eval/meter-finance-model.ts";
import { readQuickAdd } from "./read-quick-add.ts";

const { context, categoryPaths } = categoriseFixture;
const TODAY = "2026-11-01";
const accountNames = new Map(
  context.accounts.map((each) => [each.id, each.name]),
);

interface QuickAddCase {
  text: string;
  /** What the line means; fields left out are not checked. */
  expected: {
    kind: "expense" | "income" | "transfer";
    amountMinor: number | null;
    date?: string;
    category?: string;
    account?: string;
    toAccount?: string;
  };
}

const cases: QuickAddCase[] = [
  {
    text: "tesco 12.5",
    expected: {
      kind: "expense",
      amountMinor: 1250,
      date: TODAY,
      category: "Food > Groceries",
    },
  },
  {
    text: "午饭 18",
    expected: {
      kind: "expense",
      amountMinor: 1800,
      category: "Food > Eating out",
    },
  },
  {
    text: "+2000 工资",
    expected: { kind: "income", amountMinor: 200000, category: "Salary" },
  },
  {
    text: "昨天 uber 回家 23.5",
    expected: { kind: "expense", amountMinor: 2350, date: "2026-10-31" },
  },
  {
    text: "Harbour Card: you spent £35.00 at PRET A MANGER on 30/10. Available credit £1,234.56.",
    expected: {
      kind: "expense",
      amountMinor: 3500,
      date: "2026-10-30",
      category: "Food > Eating out",
      account: "Credit card",
    },
  },
  {
    text: "转500到Savings",
    expected: { kind: "transfer", amountMinor: 50000, toAccount: "Savings" },
  },
  {
    text: "coffee",
    expected: { kind: "expense", amountMinor: null, date: TODAY },
  },
];

describe("Finance quick add (real model)", () => {
  const metered = meterFinanceModel();

  it.each(cases)("reads $text", async ({ text, expected }) => {
    const reading = await readQuickAdd(metered.model, context, text, TODAY, []);
    const kind = reading.kind.value;
    const category =
      kind === "transfer" ? undefined : reading[`${kind}CategoryId`]?.value;
    const read = {
      kind,
      amountMinor: reading.amountMinor?.value ?? null,
      date: reading.date.value,
      category: categoryPaths.get(category ?? ""),
      account: accountNames.get(
        (kind === "transfer" ? reading.fromAccountId : reading.accountId)
          ?.value ?? "",
      ),
      toAccount: accountNames.get(reading.toAccountId?.value ?? ""),
    };
    console.log(text, JSON.stringify(reading));

    expect(read).toMatchObject(expected);
  });

  afterAll(() => {
    console.log(metered.summary());
  });
});
