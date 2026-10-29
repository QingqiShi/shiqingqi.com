import { describe, expect, it } from "vitest";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { buildTransactionList } from "./build-transaction-list.ts";
import { TEST_IDS, testExpense } from "./testing/create-test-replica.ts";
import { EMPTY_TRANSACTION_FILTERS } from "./transaction-filters.ts";

const TODAY = "2026-10-10";

const entriesByTransaction = new Map<string, EntryRow[]>();

function row(
  index: number,
  date: string,
  status: "posted" | "expected" = "posted",
  accountId: string = TEST_IDS.card,
): TransactionRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const { transaction, entry } = testExpense(id, id, {
    date,
    amountMinor: -100 * index,
    accountId,
    status,
  });
  entriesByTransaction.set(id, [entry]);
  return transaction;
}

const rows = [
  row(1, "2026-10-14", "expected"),
  row(2, "2026-10-12", "expected"),
  row(3, "2026-10-11"),
  row(4, "2026-10-10", "expected"),
  row(5, "2026-10-10"),
  row(6, "2026-10-09"),
  row(7, "2026-10-09", "posted", TEST_IDS.dollars),
];

function build(
  expected = false,
  query = "",
  amounts: ReadonlyMap<string, number> = new Map(
    rows.map((transaction) => [transaction.id, -1_000]),
  ),
) {
  return buildTransactionList(
    {
      rows,
      entriesByTransaction,
      amounts,
      accountById: new Map([
        [TEST_IDS.card, { currency: "GBP" }],
        [TEST_IDS.dollars, { currency: "USD" }],
      ]),
      tagIdsByTransaction: new Map(),
      categoryDescendantsById: new Map(),
      reviewIds: new Set(),
      baseCurrency: "GBP",
    },
    { ...EMPTY_TRANSACTION_FILTERS, expected, query },
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
      "7",
    ]);
    expect(
      list.transactions.map((transaction) => transaction.id.slice(-1)),
    ).toEqual(["3", "4", "5", "6", "7"]);
    expect(list.indexById.get(rows[2].id)).toBe(1);
  });

  it("shows only the Expected rows up to today when the Expected filter is on", () => {
    expect(shape(build(true))).toEqual(["2026-10-10", "4"]);
  });

  it("totals each day's posted amounts in the base currency", () => {
    expect(
      build().items.flatMap((item) =>
        item.type === "day" ? [[item.day, item.expenseMinor]] : [],
      ),
    ).toEqual([
      ["2026-10-11", -1_000],
      ["2026-10-10", -1_000],
      ["2026-10-09", -2_000],
    ]);
  });

  it("finds a row by the amount it shows, in its account's currency, or by what it counts, in the base currency", () => {
    const counted = new Map([
      [rows[5].id, -425],
      [rows[6].id, -560],
    ]);
    expect(shape(build(false, "7.00", counted))).toEqual(["2026-10-09", "7"]);
    expect(shape(build(false, "5.60", counted))).toEqual(["2026-10-09", "7"]);
    expect(shape(build(false, "4.25", counted))).toEqual(["2026-10-09", "6"]);
    expect(shape(build(false, "10.00", counted))).toEqual([]);
  });

  it("does not find a row that counts nothing by a search for 0", () => {
    const counted = new Map([[rows[5].id, 0]]);
    expect(shape(build(false, "0.", counted))).toEqual([]);
  });
});
