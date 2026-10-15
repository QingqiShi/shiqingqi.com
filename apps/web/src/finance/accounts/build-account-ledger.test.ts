import { describe, expect, it } from "vitest";
import type { TransactionRow, ValuationRow } from "../sync/row-schemas.ts";
import {
  testExpense,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { buildAccountLedger } from "./build-account-ledger.ts";

function tx(
  id: string,
  date: string,
  amountMinor: number,
  status: TransactionRow["status"] = "posted",
): TransactionRow {
  return testExpense(id, `${id}-entry`, {
    date,
    amountMinor,
    accountId: TEST_IDS.current,
    status,
  }).transaction;
}

function valuation(id: string, on: string, amountMinor: number): ValuationRow {
  return {
    id,
    householdId: TEST_IDS.household,
    accountId: TEST_IDS.current,
    on,
    amountMinor,
    source: "manual",
    note: "",
    version: 1,
    createdAt: `${on}T12:00:00.000Z`,
    updatedAt: `${on}T12:00:00.000Z`,
    deletedAt: null,
  };
}

const endOfDay: Record<string, number> = {
  "2026-10-15": 10_000,
  "2026-10-14": 12_000,
  "2026-10-12": 13_000,
  "2026-10-11": 12_400,
};

function build(
  transactions: TransactionRow[],
  {
    valuations = [],
    limit = 30,
  }: { valuations?: ValuationRow[]; limit?: number } = {},
) {
  return buildAccountLedger({
    valuations,
    transactions,
    amountOf: (row) => row.amountMinor,
    today: "2026-10-15",
    limit,
    balanceAt: (day) => endOfDay[day] ?? 0,
  });
}

function shape(ledger: ReturnType<typeof build>) {
  return ledger.days.map((day) => ({
    day: day.day,
    items: day.items.map((item) =>
      item.type === "valuation"
        ? `v:${item.valuation.id}`
        : `${item.transaction.id}:${String(item.balanceAfter)}`,
    ),
  }));
}

describe("buildAccountLedger", () => {
  it("folds Expected Entries after today into Coming up, soonest first", () => {
    const ledger = build([
      tx("dec", "2026-12-01", -3_000, "expected"),
      tx("nov", "2026-11-02", -2_000, "expected"),
      tx("oct", "2026-10-20", 500, "expected"),
      tx("due", "2026-10-15", -900, "expected"),
      tx("paid", "2026-10-15", -1_000),
    ]);
    expect(ledger.comingUp.map((item) => item.transaction.id)).toEqual([
      "oct",
      "nov",
      "dec",
    ]);
    expect(ledger.comingUpMinor).toBe(-4_500);
    expect(ledger.comingUp.every((item) => item.balanceAfter === null)).toBe(
      true,
    );
    expect(shape(ledger)).toEqual([
      { day: "2026-10-15", items: ["due:null", "paid:10000"] },
    ]);
  });

  it("keeps a posted Entry dated after today out of Coming up", () => {
    const ledger = build([
      tx("nov", "2026-11-02", -100, "expected"),
      tx("early", "2026-10-20", -200),
      tx("oct", "2026-10-18", -300, "expected"),
      tx("a", "2026-10-15", -100),
    ]);
    expect(ledger.comingUp.map((item) => item.transaction.id)).toEqual([
      "oct",
      "nov",
    ]);
    expect(shape(ledger)).toEqual([
      { day: "2026-10-20", items: ["early:0"] },
      { day: "2026-10-15", items: ["a:10000"] },
    ]);
  });

  it("groups the rest by day, Valuations then Expected then posted, with each balance after", () => {
    const ledger = build(
      [
        tx("a", "2026-10-15", -1_500),
        tx("b", "2026-10-15", -500, "expected"),
        tx("c", "2026-10-15", -500),
        tx("d", "2026-10-14", -2_000),
        tx("e", "2026-10-12", -100),
      ],
      { valuations: [valuation("val", "2026-10-12", 13_000)] },
    );
    expect(ledger.comingUp).toEqual([]);
    expect(shape(ledger)).toEqual([
      { day: "2026-10-15", items: ["b:null", "a:10000", "c:11500"] },
      { day: "2026-10-14", items: ["d:12000"] },
      { day: "2026-10-12", items: ["v:val", "e:null"] },
    ]);
  });

  it("gives each Valuation its change from the day before, except the first one", () => {
    const ledger = build([tx("a", "2026-10-15", -1_500)], {
      valuations: [
        valuation("new", "2026-10-12", 13_000),
        valuation("first", "2026-09-01", 9_000),
      ],
    });
    expect(
      ledger.days.flatMap((day) =>
        day.items.flatMap((item) =>
          item.type === "valuation" ? [item.changeMinor] : [],
        ),
      ),
    ).toEqual([600, null]);
  });

  it("stops the days at the limit and leaves Coming up out of it", () => {
    const ledger = build(
      [
        tx("later", "2026-11-01", -100, "expected"),
        tx("a", "2026-10-15", -100),
        tx("b", "2026-10-14", -100),
        tx("c", "2026-10-12", -100),
      ],
      { limit: 2 },
    );
    expect(ledger.comingUp).toHaveLength(1);
    expect(shape(ledger).map((day) => day.day)).toEqual([
      "2026-10-15",
      "2026-10-14",
    ]);
    expect(ledger.hasMore).toBe(true);
    expect(build([tx("a", "2026-10-15", -100)]).hasMore).toBe(false);
  });
});
