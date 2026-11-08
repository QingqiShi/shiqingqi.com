import { describe, expect, test } from "vitest";
import {
  mergeCalendar,
  mergeTotals,
  rangeFrom,
  rangeTotals,
} from "./calendar.ts";
import { FIVE_HOUR, SEVEN_DAY, forecast } from "./forecast.ts";
import { formatLines } from "./format-tokens.ts";
import { PIPS, levelForTokens, pipsFor } from "./levels.ts";
import { HOUR_MS, MINUTE_MS } from "./local-time.ts";
import { moodOf } from "./mood-of.ts";
import { lostStreakOf, streakOf } from "./streak-of.ts";
import type { PetDay } from "./types.ts";

const NOW = Date.parse("2026-11-05T12:00:00Z");

describe("forecast", () => {
  test("projects the recent rate to the reset", () => {
    const fc = forecast(
      [
        { at: NOW - 60 * MINUTE_MS, pct: 24 },
        { at: NOW - 30 * MINUTE_MS, pct: 29 },
      ],
      { pct: 34, at: NOW, resetsAt: NOW + 2 * HOUR_MS },
      FIVE_HOUR,
    );

    expect(fc.basis).toBe("recent");
    expect(Math.round(fc.projected)).toBe(54);
    expect(fc.fullAt).toBe(null);
  });

  test("past 100% says when the window runs out", () => {
    const fc = forecast(
      [{ at: NOW - 24 * HOUR_MS, pct: 48 }],
      { pct: 72, at: NOW, resetsAt: NOW + 3 * 24 * HOUR_MS },
      SEVEN_DAY,
    );

    expect(Math.round(fc.projected)).toBe(144);
    expect(fc.fullAt).toBe(NOW + 28 * HOUR_MS);
  });

  test("with too few samples uses the average rate since the window began", () => {
    const fc = forecast(
      [],
      { pct: 20, at: NOW, resetsAt: NOW + 4 * HOUR_MS },
      FIVE_HOUR,
    );

    expect(fc.basis).toBe("average");
    expect(Math.round(fc.projected)).toBe(100);
  });
});

test("the streak counts back from today or yesterday, and a lost streak is one of more than 3 days", () => {
  const days = [
    "2026-10-20",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
  ];

  expect(streakOf(days, "2026-11-05")).toBe(6);
  expect(streakOf(days, "2026-11-04")).toBe(6);
  expect(streakOf(days, "2026-11-06")).toBe(0);
  expect(lostStreakOf([...days, "2026-11-05"], "2026-11-05")).toBe(null);
  expect(lostStreakOf([...days, "2026-11-06"], "2026-11-06")).toBe(6);
  expect(lostStreakOf([...days, "2026-11-07"], "2026-11-07")).toBe(6);
  expect(
    lostStreakOf(
      ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05"],
      "2026-11-05",
    ),
  ).toBe(null);
});

test("the level comes from cumulative tokens, and the pips show the way to the next one", () => {
  expect(levelForTokens(0)).toBe(1);
  expect(levelForTokens(19.99e9)).toBe(1);
  expect(levelForTokens(20e9)).toBe(2);
  expect(levelForTokens(1000e9)).toBe(9);
  expect(pipsFor(2, 20.3e9)).toBe(0);
  expect(pipsFor(2, 27.4e9)).toBe(3);
  expect(pipsFor(2, 34.99e9)).toBe(6);
  expect(pipsFor(9, 1000e9)).toBe(PIPS);
});

test("the mood is sleep, then party, then worry, then happy", () => {
  const calm = {
    five: 30,
    week: 40,
    isOverForecast: false,
    isCelebrating: false,
  };

  expect(
    moodOf({ ...calm, five: 100, isCelebrating: true, isOverForecast: true }),
  ).toBe("sleep");
  expect(moodOf({ ...calm, isCelebrating: true, isOverForecast: true })).toBe(
    "party",
  );
  expect(moodOf({ ...calm, isOverForecast: true })).toBe("worry");
  expect(moodOf({ ...calm, five: 85 })).toBe("worry");
  expect(moodOf({ ...calm, week: 90 })).toBe("worry");
  expect(moodOf(calm)).toBe("happy");
});

describe("ranges", () => {
  const TODAY = "2026-11-06";
  const DAYS: PetDay[] = [
    {
      day: "2026-08-11",
      tokens: 1000,
      costUsd: 10,
      cacheRead: 100,
      promptTokens: 900,
    },
    {
      day: "2026-10-07",
      tokens: 500,
      costUsd: 5,
      cacheRead: 300,
      promptTokens: 400,
    },
    {
      day: "2026-10-08",
      tokens: 200,
      costUsd: 2,
      cacheRead: 150,
      promptTokens: 180,
    },
    { day: TODAY, tokens: 300, costUsd: 3, cacheRead: 250, promptTokens: 270 },
  ];

  test("the 30-day range starts 29 days back and the whole range at the first day", () => {
    expect(rangeFrom("30", TODAY, "2026-08-11")).toBe("2026-10-08");
    expect(rangeFrom("all", TODAY, "2026-08-11")).toBe("2026-08-11");
    expect(rangeFrom("all", TODAY, null)).toBe("2026-10-08");
  });

  test("the totals add up tokens, cost and the cache hit rate over the range alone", () => {
    const recent = rangeTotals(DAYS, "2026-10-08", 0.5);
    expect(recent).toEqual({
      tokens: 500,
      costUsd: 5,
      cacheHitRate: 400 / 450,
    });

    const all = rangeTotals(DAYS, "2026-08-11", 0.5);
    expect(all).toEqual({
      tokens: 2000,
      costUsd: 20,
      cacheHitRate: 800 / 1750,
    });
  });

  test("a day without the cache counts makes the range fall back to the given hit rate", () => {
    const old = DAYS.map(({ day, tokens, costUsd }) => ({
      day,
      tokens,
      costUsd,
    }));
    expect(rangeTotals(old, "2026-10-08", 0.42).cacheHitRate).toBe(0.42);
  });
});

test("the merge calendar fills the days without a merge, and the totals add up", () => {
  const days = mergeCalendar(
    [{ day: "2026-11-05", prs: 2, additions: 10, deletions: 4 }],
    "2026-11-04",
    "2026-11-06",
  );

  expect(days.map((d) => d.prs)).toEqual([0, 2, 0]);
  expect(mergeTotals(days)).toEqual({ prs: 2, additions: 10, deletions: 4 });
});

test("a line count that rounds up to the next unit shows that unit", () => {
  expect(formatLines(999_800)).toBe("1.0M");
});
