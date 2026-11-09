import { expect, test } from "vitest";
import { buildDays, buildView, tilesInputFor } from "./build-view.ts";
import { MINUTE_MS } from "./local-time.ts";
import type { PetCopy, PublicPetState, Range } from "./types.ts";

const COPY: PetCopy = {
  petName: "Miao",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  minutes: "{m}m",
  hours: "{h}h",
  hoursMinutes: "{h}h {m}m",
  agoMinutes: "{n}m ago",
  agoHours: "{n}h ago",
  agoDays: "{n}d ago",
  levelNames: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  levelLabel: "Lv{lv}",
  lines: {
    happy: ["happy"],
    worry: ["worry"],
    sleep: ["sleep"],
    away: ["away since {ago}"],
    party: ["party {pr}"],
    night: ["night"],
    streak: ["streak"],
    levelup: ["levelup"],
    broken: ["broken"],
    feed: ["feed {fed}"],
    pat: ["pat {patted}"],
  },
  capsule: { out: "out", over: "over {pct}" },
  tiles: { cost: "cost", streak: "streak", streakUnit: "d", cacheHit: "hit" },
  trend: { peak: "peak {value}", average: "avg {value}" },
  merges: {
    added: "+",
    deleted: "-",
    prs: "PRs",
    noneToday: "none",
    today: "{n} today",
  },
  heatmap: { less: "less", more: "more" },
  view: {
    five: "5h",
    week: "week",
    resetDone: "reset",
    resetIn: "in {time}",
    resetAt: "at {time}",
    out: "out",
    outUntil: "out until {time}",
    basisFiveRecent: "a",
    basisFiveAverage: "b",
    basisWeekRecent: "c",
    basisWeekAverage: "d",
    forecastFull: "{basis} full {time}",
    forecastFive: "{basis} {pct}",
    forecastWeek: "{basis} left {pct}",
    recent: "last {n}",
    sinceThisYear: "since {month} {d}",
    sinceOtherYear: "since {month} {d}, {y}",
    tokensRecent: "30-day",
    tokensAll: "all-time",
    merged: "{prs} in {days}",
    used: "{active} of {span}",
    trend: "{peak} {average}",
    github: "{n}",
    updated: "updated {ago}",
  },
};

const NOW = Date.parse("2026-11-06T13:00:00Z");

function stateWith(overrides: Partial<PublicPetState>): PublicPetState {
  return {
    user: "qingqi",
    updatedAt: NOW - 5 * MINUTE_MS,
    tzOffsetMin: 0,
    firstDay: "2026-10-01",
    days: [
      {
        day: "2026-10-01",
        tokens: 1000,
        costUsd: 1,
        cacheRead: 80,
        promptTokens: 100,
      },
      {
        day: "2026-11-06",
        tokens: 500,
        costUsd: 0.5,
        cacheRead: 50,
        promptTokens: 100,
      },
    ],
    quota: null,
    github: null,
    merges: null,
    party: null,
    growth: { highest: null, levelUp: null },
    pet: { fed: 0, patted: 0 },
    visitors: { fed: 0, patted: 0 },
    ...overrides,
  };
}

function viewOf(state: PublicPetState, range: Range = "30") {
  return buildView(state, { now: NOW, range, copy: COPY });
}

test("the pet sleeps with its away lines when the Mac has not uploaded for 30 minutes, or never", () => {
  const fresh = viewOf(stateWith({}));
  expect(fresh.isAway).toBe(false);
  expect(fresh.mood).toBe("happy");

  const stale = viewOf(stateWith({ updatedAt: NOW - 31 * MINUTE_MS }));
  expect(stale.isAway).toBe(true);
  expect(stale.mood).toBe("sleep");
  expect(stale.text).toBe("away since 31m ago");

  const never = viewOf(stateWith({ updatedAt: null }));
  expect(never.mood).toBe("sleep");
  expect(never.moodKey).toBe("away");
});

test("a merged PR does not wake a pet whose owner is away", () => {
  const party = { number: 7, until: NOW + MINUTE_MS };
  expect(viewOf(stateWith({ party })).mood).toBe("party");
  expect(
    viewOf(stateWith({ party, updatedAt: NOW - 2 * 60 * MINUTE_MS })).mood,
  ).toBe("sleep");
});

test("the owner's time zone decides today and day or night, not the viewer's", () => {
  const east = viewOf(stateWith({ tzOffsetMin: 8 * 60 }));
  expect(east.today).toBe("2026-11-06");
  expect(east.local.hour).toBe(21);

  const west = viewOf(stateWith({ tzOffsetMin: -8 * 60 }));
  expect(west.local.hour).toBe(5);
  expect(viewOf(stateWith({ tzOffsetMin: 11 * 60 })).today).toBe("2026-11-07");
});

test("the tiles add up the range the visitor picked", () => {
  const state = stateWith({});
  const days = (range: Range) => buildDays(state, "2026-11-06", range);
  expect(tilesInputFor(days("30"), 320, COPY)).toMatchObject({
    tokens: 500,
    todayUsd: 0.5,
    cacheHitRate: 0.5,
  });
  expect(tilesInputFor(days("all"), 320, COPY)).toMatchObject({
    tokens: 1500,
    cacheHitRate: 130 / 200,
  });
});
