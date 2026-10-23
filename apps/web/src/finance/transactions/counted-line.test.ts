import { describe, expect, it } from "vitest";
import type { AccountRow, EntryRow } from "../sync/row-schemas.ts";
import { countedLine } from "./counted-line.ts";
import { shownAmount } from "./shown-amount.ts";
import { TEST_IDS, testExpense } from "./testing/create-test-replica.ts";

const friend = "00000000-0000-4000-8000-0000000000c9";
const accountById = new Map<string, Pick<AccountRow, "kind" | "currency">>([
  [TEST_IDS.card, { kind: "credit", currency: "GBP" }],
  [TEST_IDS.current, { kind: "cash", currency: "GBP" }],
  [TEST_IDS.dollars, { kind: "cash", currency: "USD" }],
  [friend, { kind: "receivable", currency: "GBP" }],
]);

function entries(
  ...legs: [accountId: string, amountMinor: number][]
): EntryRow[] {
  return legs.map(([accountId, amountMinor], position) => ({
    ...testExpense(TEST_IDS.tescoShop, `entry-${String(position)}`, {
      date: "2026-10-01",
      amountMinor,
      accountId,
    }).entry,
    position,
  }));
}

function lineOf(
  kind: "expense" | "income" | "transfer",
  rows: EntryRow[],
  countedMinor: number,
) {
  return countedLine(
    { kind, date: "2026-10-01" },
    rows,
    countedMinor,
    shownAmount({ kind }, rows, accountById, "GBP"),
    accountById,
    "GBP",
  );
}

describe("countedLine", () => {
  it("shows the Household's share of a shared bill", () => {
    expect(
      lineOf(
        "expense",
        entries([TEST_IDS.card, -49_739], [friend, 24_870]),
        -24_869,
      ),
    ).toEqual({ type: "share", amountMinor: -24_869 });
  });

  it("shows the income left after a repayment of money owed", () => {
    expect(
      lineOf(
        "income",
        entries([TEST_IDS.current, 10_000], [friend, -4_000]),
        6_000,
      ),
    ).toEqual({ type: "incomeAfterRepayment", amountMinor: 6_000 });
  });

  it("shows the signed amount when money owed turns the row the other way", () => {
    expect(
      lineOf(
        "expense",
        entries([TEST_IDS.card, -10_000], [friend, 15_000]),
        5_000,
      ),
    ).toEqual({ type: "counts", amountMinor: 5_000 });
  });

  it("says a repayment of money owed counts nothing", () => {
    expect(
      lineOf(
        "income",
        entries([TEST_IDS.current, 24_870], [friend, -24_870]),
        0,
      ),
    ).toEqual({ type: "notCounted" });
  });

  it("shows the amount in the base currency of a foreign account", () => {
    expect(
      lineOf("expense", entries([TEST_IDS.dollars, -1_000]), -800),
    ).toEqual({
      type: "converted",
      amountMinor: -800,
    });
  });

  it("shows nothing when the shown amount is what counts", () => {
    expect(
      lineOf("expense", entries([TEST_IDS.card, -1_250]), -1_250),
    ).toBeNull();
    expect(
      lineOf(
        "transfer",
        entries([TEST_IDS.current, -5_000], [friend, 5_000]),
        0,
      ),
    ).toBeNull();
  });
});
