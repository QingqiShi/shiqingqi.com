import { describe, expect, it } from "vitest";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { expectWithinBudget } from "../testing/expect-within-budget.ts";
import { buildChartSeries } from "./build-chart-series.ts";
import { chartDomain } from "./chart-domain.ts";
import { chartRangeStart } from "./chart-range-start.ts";
import { CHART_RANGES } from "./chart-ranges.ts";
import { dateTicks } from "./date-ticks.ts";
import { nearestIndex } from "./nearest-index.ts";
import { niceTicks } from "./nice-ticks.ts";
import { sampleAccountBalance, sampleBalances } from "./sample-balances.ts";
import { MAX_CHART_POINTS, sampleDays } from "./sample-days.ts";
import { summariseSeries } from "./summarise-series.ts";
import { trailingAverage } from "./trailing-average.ts";

const TODAY = "2026-10-10";

describe("chartRangeStart", () => {
  it("counts months back from today and clamps to the first day with data", () => {
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

describe("sampleDays", () => {
  it("keeps every day of a short range", () => {
    const { days, stride } = sampleDays(100, 130);
    expect(stride).toBe(1);
    expect(days.length).toBe(31);
    expect(days[0]).toBe(100);
    expect(days[30]).toBe(130);
  });

  it("samples a long range at an even stride that ends on the last day", () => {
    const { days, stride } = sampleDays(0, 2200, 400);
    expect(days.length).toBeLessThanOrEqual(401);
    expect(days[0]).toBe(0);
    expect(days[days.length - 1]).toBe(2200);
    expect(days[days.length - 1] - days[days.length - 2]).toBe(stride);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1]);
    }
  });

  it("adds lead-in days before the start at the same stride", () => {
    const { days, firstVisible } = sampleDays(100, 130, 400, 5);
    expect(firstVisible).toBe(5);
    expect([...days.subarray(0, 6)]).toEqual([95, 96, 97, 98, 99, 100]);
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

describe("trailingAverage", () => {
  it("averages the points inside the window ending on each day", () => {
    const days = Int32Array.from([0, 1, 2, 3, 4]);
    const values = Float64Array.from([1, 2, 3, 4, 5]);
    expect([...trailingAverage(days, values, 3)]).toEqual([1, 1.5, 2, 3, 4]);
  });
});

describe("buildChartSeries", () => {
  it("reads lead-in days for the trend and returns only the range", () => {
    const valuesAt = (days: Int32Array) =>
      Float64Array.from(days, (day) =>
        day >= toEpochDay("2026-10-01") ? 100 : 0,
      );
    const chart = buildChartSeries({
      start: "2026-10-01",
      end: TODAY,
      firstDay: "2026-01-01",
      valuesAt,
      trendWindowDays: 91,
    });
    expect(chart.days.length).toBe(10);
    expect(chart.days[0]).toBe(toEpochDay("2026-10-01"));
    expect(chart.trend?.[0]).toBeCloseTo(100 / 91);
  });

  it("keeps at most 400 points for any range", () => {
    for (const range of CHART_RANGES) {
      const chart = buildChartSeries({
        start: chartRangeStart(range, TODAY, "2010-01-01"),
        end: TODAY,
        firstDay: "2010-01-01",
        valuesAt: (days) => new Float64Array(days.length),
      });
      expect(chart.days.length).toBeLessThanOrEqual(401);
      expect(chart.days[chart.days.length - 1]).toBe(toEpochDay(TODAY));
    }
  });
});

describe("summariseSeries", () => {
  it("finds the extremes and the mean", () => {
    expect(summariseSeries(Float64Array.from([3, 1, 4, 1, 5]))).toEqual({
      first: 3,
      last: 5,
      min: 1,
      minIndex: 3,
      max: 5,
      maxIndex: 4,
      average: 2.8,
    });
  });
});

describe("niceTicks", () => {
  it("picks round steps inside the domain", () => {
    expect(niceTicks(40_123_456, 52_987_654, 4)).toEqual([
      45_000_000, 50_000_000,
    ]);
    expect(niceTicks(-750_000, 0, 4)).toEqual([
      -600_000, -400_000, -200_000, 0,
    ]);
  });
});

describe("dateTicks", () => {
  it("labels weeks, months or years by span", () => {
    const end = toEpochDay(TODAY);
    expect(
      dateTicks(end - 30, end, 5).every((tick) => tick.unit === "day"),
    ).toBe(true);
    const months = dateTicks(toEpochDay("2026-04-10"), end, 5);
    expect(months.map((tick) => fromEpochDay(tick.epochDay))).toEqual([
      "2026-05-01",
      "2026-07-01",
      "2026-09-01",
    ]);
    const years = dateTicks(toEpochDay("2020-03-02"), end, 5);
    expect(years.every((tick) => tick.unit === "year")).toBe(true);
    expect(years.length).toBeLessThanOrEqual(5);
  });
});

describe("chart geometry", () => {
  it("pads the domain and finds the nearest point", () => {
    expect(chartDomain(Float64Array.from([0, 100]))).toEqual([-8, 108]);
    const xs = Float64Array.from([0, 10, 20]);
    expect(nearestIndex(xs, 4)).toBe(0);
    expect(nearestIndex(xs, 6)).toBe(1);
    expect(nearestIndex(xs, 99)).toBe(2);
  });
});

describe("range switching cost", () => {
  it("samples six years of 60 accounts in well under a frame", () => {
    const accounts = Array.from({ length: 60 }, (_, index) => ({
      id: String(index),
      currency: index % 10 === 0 ? "USD" : "GBP",
      excludedFromNetWorth: false,
      closedOn: null,
    }));
    const series = new Map(
      accounts.map((account, index) => {
        const entries = Array.from({ length: 1000 }, (_, entry) => ({
          date: addDays("2020-03-02", (entry * 7 + index) % 2222),
          amountMinor: ((entry * 7919) % 20_000) - 10_000,
        }));
        return [
          account.id,
          computeBalanceDays(
            [{ on: "2020-03-02", amountMinor: 1_000_000 }],
            entries,
          ),
        ];
      }),
    );
    const fx = createFxIndex(
      Array.from({ length: 300 }, (_, week) => ({
        base: "USD",
        quote: "GBP",
        on: addDays("2020-03-02", week * 7),
        rate: 0.75 + (week % 10) / 100,
      })),
      "GBP",
    );
    const trendWindowDays = 91;
    const timings: number[] = [];
    for (const range of CHART_RANGES) {
      let sampledDays = 0;
      const started = performance.now();
      buildChartSeries({
        start: chartRangeStart(range, TODAY, "2020-03-02"),
        end: TODAY,
        firstDay: "2020-03-02",
        valuesAt: (days) => {
          sampledDays += days.length;
          return sampleBalances(accounts, series, fx, days);
        },
        trendWindowDays,
      });
      timings.push(performance.now() - started);
      expect(sampledDays).toBeLessThanOrEqual(
        MAX_CHART_POINTS + trendWindowDays,
      );
    }
    expectWithinBudget(Math.max(...timings), 16);
  });
});
