import { describe, expect, it } from "vitest";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { buildTransactionList } from "./build-transaction-list.ts";
import { TEST_IDS, testExpense } from "./testing/create-test-replica.ts";
import { EMPTY_TRANSACTION_FILTERS } from "./transaction-filters.ts";

const TODAY = "2026-10-10";

function row(
  index: number,
  date: string,
  status: "posted" | "expected" = "posted",
): TransactionRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return testExpense(id, id, {
    date,
    amountMinor: -100 * index,
    accountId: TEST_IDS.card,
    status,
  }).transaction;
}

const rows = [
  row(1, "2026-10-14", "expected"),
  row(2, "2026-10-12", "expected"),
  row(3, "2026-10-11"),
  row(4, "2026-10-10", "expected"),
  row(5, "2026-10-10"),
  row(6, "2026-10-09"),
];

function build(upcomingOpen: boolean, expected = false) {
  return buildTransactionList(
    {
      rows,
      entriesByTransaction: new Map(),
      tagIdsByTransaction: new Map(),
      categoryDescendantsById: new Map(),
      baseCurrency: "GBP",
    },
    { ...EMPTY_TRANSACTION_FILTERS, expected },
    { today: TODAY, upcomingOpen },
  );
}

function shape(list: ReturnType<typeof build>) {
  return list.items.map((item) =>
    item.type === "transaction"
      ? item.row.id.slice(-1)
      : item.type === "day"
        ? item.day
        : `upcoming ${String(item.count)} ${String(item.totalMinor)}`,
  );
}

describe("buildTransactionList", () => {
  it("folds Expected rows after today into one closed line, so the list starts at today", () => {
    const list = build(false);
    expect(shape(list)).toEqual([
      "upcoming 2 -300",
      "2026-10-11",
      "3",
      "2026-10-10",
      "4",
      "5",
      "2026-10-09",
      "6",
    ]);
    expect(
      list.transactions.map((transaction) => transaction.id.slice(-1)),
    ).toEqual(["3", "4", "5", "6"]);
    expect(list.matchCount).toBe(6);
    expect(list.indexById.get(rows[2].id)).toBe(2);
  });

  it("shows the folded rows soonest first when open", () => {
    expect(shape(build(true)).slice(0, 5)).toEqual([
      "upcoming 2 -300",
      "2026-10-12",
      "2",
      "2026-10-14",
      "1",
    ]);
  });

  it("keeps Expected rows in their days when the Expected filter is on", () => {
    expect(shape(build(false, true))).toEqual([
      "2026-10-14",
      "1",
      "2026-10-12",
      "2",
      "2026-10-10",
      "4",
    ]);
  });
});
