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

function build(expected = false) {
  return buildTransactionList(
    {
      rows,
      entriesByTransaction: new Map(),
      tagIdsByTransaction: new Map(),
      categoryDescendantsById: new Map(),
      reviewIds: new Set(),
      baseCurrency: "GBP",
    },
    { ...EMPTY_TRANSACTION_FILTERS, expected },
    { today: TODAY },
  );
}

function shape(list: ReturnType<typeof build>) {
  return list.items.map((item) =>
    item.type === "transaction" ? item.row.id.slice(-1) : item.day,
  );
}

describe("buildTransactionList", () => {
  it("leaves out Expected rows after today, so the list starts at today", () => {
    const list = build();
    expect(shape(list)).toEqual([
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
    expect(list.indexById.get(rows[2].id)).toBe(1);
  });

  it("shows only the Expected rows up to today when the Expected filter is on", () => {
    expect(shape(build(true))).toEqual(["2026-10-10", "4"]);
  });
});
