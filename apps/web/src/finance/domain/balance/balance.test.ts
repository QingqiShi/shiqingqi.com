import { describe, expect, it } from "vitest";
import { addDays } from "../dates/add-days.ts";
import { toEpochDay } from "../dates/to-epoch-day.ts";
import { balanceAt, balanceAtEpochDay } from "./balance-at.ts";
import {
  balanceSeriesFromRows,
  balanceSeriesToRows,
  computeBalanceDays,
  EMPTY_BALANCE_SERIES,
  type BalanceSeries,
  type EntryInput,
  type ValuationInput,
} from "./compute-balance-days.ts";
import { createFxIndex } from "./create-fx-index.ts";
import {
  accountBalanceAt,
  netWorthAt,
  type NetWorthAccount,
} from "./net-worth-at.ts";

function entry(date: string, amountMinor: number): EntryInput {
  return { date, amountMinor };
}

function valuation(on: string, amountMinor: number): ValuationInput {
  return { on, amountMinor };
}

function rows(series: BalanceSeries) {
  return balanceSeriesToRows(series).map(
    ({ day, balanceMinor }) => `${day} ${String(balanceMinor)}`,
  );
}

describe("computeBalanceDays", () => {
  it("is empty for an account with no history", () => {
    const series = computeBalanceDays([], []);
    expect(rows(series)).toEqual([]);
    expect(balanceAt(series, "2026-10-09")).toBe(0);
  });

  it("adds entries up from zero, one row per day with a change", () => {
    const series = computeBalanceDays(
      [],
      [
        entry("2026-10-01", 10000),
        entry("2026-10-01", -250),
        entry("2026-10-03", -1250),
      ],
    );
    expect(rows(series)).toEqual(["2026-10-01 9750", "2026-10-03 8500"]);
  });

  it("takes a valuation as the balance and adds later entries to it", () => {
    const series = computeBalanceDays(
      [valuation("2026-10-02", 50000)],
      [entry("2026-10-01", 10000), entry("2026-10-04", -500)],
    );
    expect(rows(series)).toEqual([
      "2026-10-01 10000",
      "2026-10-02 50000",
      "2026-10-04 49500",
    ]);
  });

  it("keeps entries on a valuation day inside the valuation", () => {
    const series = computeBalanceDays(
      [valuation("2026-10-02", 50000)],
      [
        entry("2026-10-02", -999),
        entry("2026-10-02", 123),
        entry("2026-10-03", -500),
      ],
    );
    expect(rows(series)).toEqual(["2026-10-02 50000", "2026-10-03 49500"]);
  });

  it("starts again from each valuation", () => {
    const series = computeBalanceDays(
      [valuation("2026-01-01", 1000), valuation("2026-03-01", 5000)],
      [
        entry("2026-02-01", 100),
        entry("2026-03-01", 7),
        entry("2026-04-01", -200),
      ],
    );
    expect(rows(series)).toEqual([
      "2026-01-01 1000",
      "2026-02-01 1100",
      "2026-03-01 5000",
      "2026-04-01 4800",
    ]);
  });

  it("gives the same series for input in any order", () => {
    const valuations = [
      valuation("2026-03-01", 5000),
      valuation("2026-01-01", 1000),
    ];
    const entries = [
      entry("2026-04-01", -200),
      entry("2026-02-01", 100),
      entry("2025-12-01", 40),
      entry("2026-02-01", 1),
    ];
    const shuffled = computeBalanceDays(valuations, entries);
    const sorted = computeBalanceDays(
      [...valuations].sort((a, b) => a.on.localeCompare(b.on)),
      [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    );
    expect(rows(shuffled)).toEqual(rows(sorted));
    expect(rows(shuffled)).toEqual([
      "2025-12-01 40",
      "2026-01-01 1000",
      "2026-02-01 1101",
      "2026-03-01 5000",
      "2026-04-01 4800",
    ]);
  });

  it("matches a day-by-day reference on random histories", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    const start = "2020-01-01";

    for (let run = 0; run < 20; run++) {
      const entries = Array.from({ length: 300 }, () =>
        entry(
          addDays(start, Math.floor(random() * 400)),
          Math.round((random() - 0.6) * 20000),
        ),
      );
      const valuationDays = new Set(
        Array.from({ length: 8 }, () =>
          addDays(start, Math.floor(random() * 400)),
        ),
      );
      const valuations = [...valuationDays].map((on) =>
        valuation(on, Math.round(random() * 1_000_000)),
      );
      const series = computeBalanceDays(valuations, entries);

      let expected = 0;
      for (let offset = -1; offset <= 401; offset++) {
        const day = addDays(start, offset);
        const asserted = valuations.find((v) => v.on === day);
        expected = asserted
          ? asserted.amountMinor
          : expected +
            entries
              .filter((e) => e.date === day)
              .reduce((sum, e) => sum + e.amountMinor, 0);
        expect(balanceAt(series, day)).toBe(expected);
      }
    }
  });
});

describe("balanceAt", () => {
  const series = computeBalanceDays(
    [valuation("2026-10-05", 10000)],
    [entry("2026-10-01", 500), entry("2026-10-08", -2000)],
  );

  it("is 0 before the first change", () => {
    expect(balanceAt(series, "2026-09-30")).toBe(0);
  });

  it("carries the last change forward to later days", () => {
    expect(balanceAt(series, "2026-10-01")).toBe(500);
    expect(balanceAt(series, "2026-10-04")).toBe(500);
    expect(balanceAt(series, "2026-10-05")).toBe(10000);
    expect(balanceAt(series, "2026-10-07")).toBe(10000);
    expect(balanceAt(series, "2026-10-08")).toBe(8000);
    expect(balanceAt(series, "2030-01-01")).toBe(8000);
  });

  it("takes an epoch day for hot loops", () => {
    expect(balanceAtEpochDay(series, toEpochDay("2026-10-06"))).toBe(10000);
    expect(balanceAtEpochDay(EMPTY_BALANCE_SERIES, 0)).toBe(0);
  });
});

describe("balance series rows", () => {
  it("round-trip through account_balance_days rows in any order", () => {
    const series = computeBalanceDays(
      [valuation("2026-10-05", 10000)],
      [entry("2026-10-01", 500), entry("2026-10-08", -2000)],
    );
    const stored = balanceSeriesToRows(series).reverse();
    expect(rows(balanceSeriesFromRows(stored))).toEqual(rows(series));
  });
});

describe("createFxIndex", () => {
  const fx = createFxIndex(
    [
      { base: "CNY", quote: "GBP", on: "2026-01-01", rate: 0.1 },
      { base: "CNY", quote: "GBP", on: "2026-06-01", rate: 0.11 },
      { base: "GBP", quote: "USD", on: "2026-01-01", rate: 1.25 },
      { base: "USD", quote: "EUR", on: "2026-01-01", rate: 0.9 },
      { base: "JPY", quote: "GBP", on: "2026-01-01", rate: 0.005 },
    ],
    "GBP",
  );
  const day = (d: string) => toEpochDay(d);

  it("uses the latest rate on or before the day", () => {
    expect(fx.rateToBase("CNY", day("2026-05-31"))).toBe(0.1);
    expect(fx.rateToBase("CNY", day("2026-06-01"))).toBe(0.11);
    expect(fx.rateToBase("CNY", day("2027-01-01"))).toBe(0.11);
  });

  it("inverts a rate quoted from the base currency", () => {
    expect(fx.rateToBase("USD", day("2026-02-01"))).toBe(0.8);
  });

  it("uses the earliest rate before any rate exists", () => {
    expect(fx.rateToBase("CNY", day("2025-01-01"))).toBe(0.1);
  });

  it("counts a currency with no rate to the base at par", () => {
    expect(fx.rateToBase("EUR", day("2026-02-01"))).toBe(1);
    expect(fx.toBase(500, "EUR", day("2026-02-01"))).toBe(500);
  });

  it("converts minor units across currency exponents", () => {
    expect(fx.toBase(10000, "CNY", day("2026-02-01"))).toBeCloseTo(1000, 9);
    expect(fx.toBase(1000, "JPY", day("2026-02-01"))).toBeCloseTo(500, 9);
    expect(fx.toBase(1234, "GBP", day("2026-02-01"))).toBe(1234);
  });

  it("lets a later row win on the same day", () => {
    const sameDay = createFxIndex(
      [
        { base: "CNY", quote: "GBP", on: "2026-01-01", rate: 0.1 },
        { base: "GBP", quote: "CNY", on: "2026-01-01", rate: 8 },
      ],
      "GBP",
    );
    expect(sameDay.rateToBase("CNY", day("2026-01-01"))).toBe(0.125);
  });
});

describe("netWorthAt", () => {
  const accounts: NetWorthAccount[] = [
    {
      id: "current",
      currency: "GBP",
      excludedFromNetWorth: false,
      closedOn: null,
    },
    {
      id: "card",
      currency: "GBP",
      excludedFromNetWorth: false,
      closedOn: null,
    },
    {
      id: "alipay",
      currency: "CNY",
      excludedFromNetWorth: false,
      closedOn: null,
    },
    {
      id: "instalments",
      currency: "GBP",
      excludedFromNetWorth: true,
      closedOn: null,
    },
    {
      id: "student-loan",
      currency: "GBP",
      excludedFromNetWorth: false,
      closedOn: "2026-06-01",
    },
    {
      id: "never-used",
      currency: "GBP",
      excludedFromNetWorth: false,
      closedOn: null,
    },
  ];
  const series = new Map<string, BalanceSeries>([
    [
      "current",
      computeBalanceDays(
        [valuation("2026-01-01", 500000)],
        [entry("2026-03-01", -12345)],
      ),
    ],
    ["card", computeBalanceDays([], [entry("2026-02-01", -20000)])],
    ["alipay", computeBalanceDays([valuation("2026-01-01", 10003)], [])],
    ["instalments", computeBalanceDays([valuation("2026-01-01", -99999)], [])],
    [
      "student-loan",
      computeBalanceDays(
        [valuation("2026-01-01", -300000)],
        [entry("2026-05-01", 1003)],
      ),
    ],
  ]);
  const fx = createFxIndex(
    [{ base: "CNY", quote: "GBP", on: "2026-01-01", rate: 0.1 }],
    "GBP",
  );

  it("sums counted accounts in the base currency", () => {
    expect(netWorthAt(accounts, series, fx, "2026-01-01")).toBe(
      500000 + 1000 - 300000,
    );
    expect(netWorthAt(accounts, series, fx, "2026-05-31")).toBe(
      500000 - 12345 - 20000 + 1000 - 300000 + 1003,
    );
  });

  it("counts a closed account as 0 from its closing day on", () => {
    expect(netWorthAt(accounts, series, fx, "2026-06-01")).toBe(
      500000 - 12345 - 20000 + 1000,
    );
    const studentLoan = { closedOn: "2026-06-01" };
    expect(
      accountBalanceAt(studentLoan, series.get("student-loan"), "2026-05-31"),
    ).toBe(-298997);
    expect(
      accountBalanceAt(studentLoan, series.get("student-loan"), "2026-06-01"),
    ).toBe(0);
  });

  it("is 0 before any history", () => {
    expect(netWorthAt(accounts, series, fx, "2025-01-01")).toBe(0);
  });

  it("rounds the converted sum once, at the end", () => {
    const halfPennies = new Map<string, BalanceSeries>([
      ["a", computeBalanceDays([valuation("2026-01-01", 5)], [])],
      ["b", computeBalanceDays([valuation("2026-01-01", 5)], [])],
    ]);
    const cny = (id: string): NetWorthAccount => ({
      id,
      currency: "CNY",
      excludedFromNetWorth: false,
      closedOn: null,
    });
    expect(
      netWorthAt([cny("a"), cny("b")], halfPennies, fx, "2026-01-01"),
    ).toBe(1);
  });
});
