import { describe, expect, test } from "vitest";
import {
  buildTestIndex,
  postedRow,
} from "../analytics/testing/build-test-index.ts";
import {
  barWindowEnd,
  buildMonthBars,
  buildMonthView,
} from "./build-month-view.ts";
import { monthBounds, resolveMonth } from "./month-bounds.ts";

const index = buildTestIndex(
  [
    postedRow("old", "2026-09-30", -1_000, "food"),
    postedRow("pay", "2026-11-01", 385_000, null, "income"),
    postedRow("rent", "2026-11-02", -225_000, "home"),
    postedRow("coffee", "2026-11-02", -450, "food"),
    postedRow("lunch", "2026-11-02", -1_200, "food"),
    postedRow("refund", "2026-11-03", 300, "food"),
    postedRow("car", "2026-11-30", -34_800, "car"),
    postedRow("next", "2026-12-01", -9_999, "food"),
  ],
  ["food", "home", "car"],
);

const idOf = (row: number) => index.transactionIds[row];

describe("buildMonthView", () => {
  const view = buildMonthView(index, "2026-11");

  test("adds up money in, money out net of refunds, and net for the month alone", () => {
    expect(view.moneyIn).toBe(385_000);
    expect(view.moneyOut).toBe(225_000 + 450 + 1_200 - 300 + 34_800);
    expect(view.net).toBe(view.moneyIn - view.moneyOut);
    expect(view.count).toBe(6);
  });

  test("lays the month out on a week that starts on Monday", () => {
    // 1 November 2026 is a Sunday.
    expect(view.leadingBlanks).toBe(6);
    expect(view.days).toHaveLength(30);
  });

  test("names income and large expenses, and adds the rest to the day's everyday spending", () => {
    const [first, second, third] = view.days;
    expect(first.notable.map(idOf)).toEqual(["pay"]);
    expect(second.notable.map(idOf)).toEqual(["rent"]);
    expect(second.everyday).toBe(-1_650);
    expect(third.notable).toEqual([]);
    expect(third.everyday).toBe(300);
    expect(view.days[29].notable.map(idOf)).toEqual(["car"]);
  });

  test("gives each Category its slice of the month's spending, and adds a slice under 5% to Other", () => {
    const value = (id: string) =>
      view.categories.find((slice) => slice.categoryId === id)?.value;
    expect(value("home")).toBe(225_000);
    expect(value("car")).toBe(34_800);
    expect(value("food")).toBe(0);
    expect(view.categories.at(-1)).toMatchObject({
      tone: "other",
      value: 1_350,
    });
  });
});

test("buildMonthBars adds up each month of the strip, empty ones too", () => {
  const bars = buildMonthBars(index, "2026-12", 4);
  expect(bars.map((bar) => [bar.month, bar.net, bar.hasData])).toEqual([
    ["2026-09", -1_000, true],
    ["2026-10", 0, false],
    ["2026-11", 385_000 - 261_150, true],
    ["2026-12", -9_999, true],
  ]);
});

test("barWindowEnd keeps the strip at the current month until the month leaves it", () => {
  expect(barWindowEnd("2026-01", "2026-11", 12)).toBe("2026-11");
  expect(barWindowEnd("2025-11", "2026-11", 12)).toBe("2026-05");
});

describe("month bounds", () => {
  const bounds = monthBounds(index.firstDay, "2026-11-05");

  test("run from the first Transaction to the current month", () => {
    expect(bounds).toEqual({ first: "2026-09", last: "2026-11" });
  });

  test("hold the month in the URL inside them, and default to the current month", () => {
    expect(resolveMonth(null, bounds)).toBe("2026-11");
    expect(resolveMonth("2026-10", bounds)).toBe("2026-10");
    expect(resolveMonth("2027-01", bounds)).toBe("2026-11");
    expect(resolveMonth("2020-01", bounds)).toBe("2026-09");
    expect(resolveMonth("2026-13", bounds)).toBe("2026-11");
  });
});
