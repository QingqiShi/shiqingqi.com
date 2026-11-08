import { DAY_MS, HOUR_MS, localTime } from "#src/pet/local-time.ts";
import type { PetDay, PetMergeDay, PetSample } from "#src/pet/types.ts";
import type { UploadBody } from "../upload/upload-body-schema.ts";
import { devAccount } from "./dev-account.ts";

/** A seeded pseudo-random source, so every `pnpm dev` shows the same pet. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const localDay = (time: number, tzOffsetMin: number) =>
  localTime(time, tzOffsetMin).day;

function usageDays(
  now: number,
  tzOffsetMin: number,
  count: number,
  scale: number,
  seed: number,
) {
  const next = random(seed);
  const days: PetDay[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const time = now - back * DAY_MS;
    const { weekday } = localTime(time, tzOffsetMin);
    const isWeekend = weekday === 0 || weekday === 6;
    if (next() < (isWeekend ? 0.45 : 0.08)) continue;
    const growth = 0.4 + 0.6 * ((count - back) / count);
    const tokens = Math.round(
      scale * growth * (isWeekend ? 0.35 : 1) * (0.4 + next() * 1.2),
    );
    days.push({
      day: localDay(time, tzOffsetMin),
      tokens,
      costUsd: Math.round(tokens * 0.0000008 * 100) / 100,
      cacheRead: Math.round(tokens * (0.86 + next() * 0.08)),
      promptTokens: Math.round(tokens * (0.95 + next() * 0.02)),
    });
  }
  return days;
}

function quotaSamples(now: number) {
  const samples: PetSample[] = [];
  let five = 0;
  let week = 22;
  for (let at = now - 3 * DAY_MS; at <= now; at += 10 * 60_000) {
    five = (at - now) % (5 * HOUR_MS) === 0 ? 0 : Math.min(100, five + 1.4);
    week = Math.min(100, week + 0.09);
    samples.push({ at, five: Math.round(five), week: Math.round(week) });
  }
  return samples;
}

function githubLevels(start: number, end: number, seed: number) {
  const next = random(seed);
  let levels = "";
  for (let time = start; time <= end; time += DAY_MS) {
    const roll = next();
    levels +=
      roll < 0.3
        ? "0"
        : roll < 0.55
          ? "1"
          : roll < 0.8
            ? "2"
            : roll < 0.93
              ? "3"
              : "4";
  }
  return levels;
}

function mergeDays(now: number, tzOffsetMin: number, from: number) {
  const next = random(7);
  const days: PetMergeDay[] = [];
  for (let time = from; time <= now; time += DAY_MS) {
    if (next() < 0.4) continue;
    const prs = 1 + Math.floor(next() * 5);
    days.push({
      day: localDay(time, tzOffsetMin),
      prs,
      additions: prs * Math.round(40 + next() * 400),
      deletions: prs * Math.round(10 + next() * 150),
    });
  }
  return days;
}

/**
 * Two machines' uploads that look like a few months of real use, so that
 * `pnpm dev` shows a pet that is awake and well grown. The times are relative
 * to `now`.
 */
export function devFixtureUploads(
  now: number,
): { machine: string; body: UploadBody }[] {
  const tzOffsetMin = -new Date(now).getTimezoneOffset();
  const githubStart = now - 364 * DAY_MS - new Date(now).getUTCDay() * DAY_MS;
  const mergesFrom = now - 90 * DAY_MS;
  const main: UploadBody = {
    v: 1,
    at: now - 60_000,
    tzOffsetMin,
    firstDay: localDay(now - 160 * DAY_MS, tzOffsetMin),
    days: usageDays(now, tzOffsetMin, 160, 320_000_000, 1),
    quota: {
      at: now - 60_000,
      five: { pct: 46, resetsAt: now + 2.2 * HOUR_MS },
      week: { pct: 61, resetsAt: now + 3.4 * DAY_MS },
      samples: quotaSamples(now - 60_000),
    },
    github: {
      fetchedAt: now - HOUR_MS,
      total: 2140,
      start: localDay(githubStart, tzOffsetMin),
      levels: githubLevels(githubStart, now, 3),
    },
    merges: {
      from: localDay(mergesFrom, tzOffsetMin),
      days: mergeDays(now, tzOffsetMin, mergesFrom),
    },
    party: null,
    growth: { highest: 2, levelUp: null },
    pet: { fed: 37, patted: 112 },
  };
  const second: UploadBody = {
    ...main,
    at: now - 40 * 60_000,
    firstDay: localDay(now - 60 * DAY_MS, tzOffsetMin),
    days: usageDays(now, tzOffsetMin, 60, 90_000_000, 2).map(
      ({ promptTokens: _promptTokens, ...day }) => day,
    ),
    quota: null,
    github: null,
    merges: null,
    pet: { fed: 12, patted: 40 },
  };
  return [
    { machine: devAccount.machine, body: main },
    { machine: "dev-mini", body: second },
  ];
}
