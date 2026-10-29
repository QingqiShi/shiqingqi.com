import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { chartRangeStart } from "./chart-range-start.ts";
import { sampleAccountBalance, sampleBalances } from "./sample-balances.ts";
import { sampleDays } from "./sample-days.ts";

const TODAY = "2026-10-10";

describe("chartRangeStart", () => {
  it("counts days or months back from today and clamps to the first day with data", () => {
    expect(chartRangeStart("1W", TODAY, null)).toBe("2026-10-03");
    expect(chartRangeStart("1M", TODAY, null)).toBe("2026-09-10");
    expect(chartRangeStart("3M", TODAY, null)).toBe("2026-07-10");
    expect(chartRangeStart("6M", TODAY, null)).toBe("2026-04-10");
    expect(chartRangeStart("YTD", TODAY, null)).toBe("2026-01-01");
    expect(chartRangeStart("1Y", TODAY, null)).toBe("2025-10-10");
    expect(chartRangeStart("5Y", TODAY, "2020-03-02")).toBe("2021-10-10");
    expect(chartRangeStart("5Y", TODAY, "2024-02-01")).toBe("2024-02-01");
    expect(chartRangeStart("all", TODAY, "2020-03-02")).toBe("2020-03-02");
    expect(chartRangeStart("all", TODAY, null)).toBe("2026-09-10");
  });

  it("never starts after today", () => {
    expect(chartRangeStart("1M", TODAY, "2026-12-01")).toBe(TODAY);
  });
});

describe("sampleBalances", () => {
  const accounts = [
    {
      id: "a",
      currency: "GBP",
      excludedFromNetWorth: false,
      closedOn: null,
    },
    {
      id: "b",
      currency: "USD",
      excludedFromNetWorth: false,
      closedOn: "2026-03-01",
    },
    { id: "c", currency: "GBP", excludedFromNetWorth: true, closedOn: null },
  ];
  const series = new Map([
    [
      "a",
      computeBalanceDays(
        [{ on: "2026-01-05", amountMinor: 10_000 }],
        [
          { date: "2026-01-20", amountMinor: -2_500 },
          { date: "2026-02-14", amountMinor: 7_333 },
        ],
      ),
    ],
    ["b", computeBalanceDays([{ on: "2026-01-10", amountMinor: 5_001 }], [])],
    ["c", computeBalanceDays([{ on: "2026-01-01", amountMinor: 99 }], [])],
  ]);
  const fx = createFxIndex(
    [
      { base: "USD", quote: "GBP", on: "2026-01-01", rate: 0.8 },
      { base: "USD", quote: "GBP", on: "2026-02-01", rate: 0.75 },
    ],
    "GBP",
  );

  it("matches netWorthAt on every day", () => {
    const { days } = sampleDays(
      toEpochDay("2025-12-25"),
      toEpochDay("2026-03-10"),
    );
    const values = sampleBalances(accounts, series, fx, days);
    days.forEach((day, index) => {
      expect(values[index]).toBe(
        netWorthAt(accounts, series, fx, fromEpochDay(day)),
      );
    });
  });

  it("samples one account in its own currency and stops at its closing day", () => {
    const days = Int32Array.from(
      ["2026-01-09", "2026-01-10", "2026-02-28", "2026-03-01"],
      toEpochDay,
    );
    expect([
      ...sampleAccountBalance(series.get("b"), "2026-03-01", days),
    ]).toEqual([0, 5_001, 5_001, 0]);
  });
});
