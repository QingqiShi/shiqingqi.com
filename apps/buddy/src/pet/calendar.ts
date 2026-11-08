import { addDays, dayFromNumber, dayNumber } from "./local-time.ts";
import type { PetDay, PetMergeDay, Range } from "./types.ts";

function fillDays<T extends { day: string }>(
  days: readonly T[],
  from: string,
  to: string,
  empty: (day: string) => T,
): T[] {
  const map = new Map(days.map((d) => [d.day, d]));
  const out: T[] = [];
  for (let n = dayNumber(from); n <= dayNumber(to); n++) {
    const day = dayFromNumber(n);
    out.push(map.get(day) ?? empty(day));
  }

  return out;
}

export function calendar(days: readonly PetDay[], from: string, to: string) {
  return fillDays(days, from, to, (day) => ({ day, tokens: 0, costUsd: 0 }));
}

export function mergeCalendar(
  days: readonly PetMergeDay[],
  from: string,
  to: string,
) {
  return fillDays(days, from, to, (day) => ({
    day,
    prs: 0,
    additions: 0,
    deletions: 0,
  }));
}

export function mergeTotals(days: readonly PetMergeDay[]) {
  return days.reduce(
    (sum, d) => ({
      prs: sum.prs + d.prs,
      additions: sum.additions + d.additions,
      deletions: sum.deletions + d.deletions,
    }),
    {
      prs: 0,
      additions: 0,
      deletions: 0,
    },
  );
}

export const RECENT_DAYS = 30;

/** The first day a range shows: the last 30 days, or every day since the first day with Claude data. */
export function rangeFrom(
  range: Range,
  today: string,
  firstDay: string | null,
) {
  const recent = addDays(today, -(RECENT_DAYS - 1));

  return range === "all" && firstDay !== null ? firstDay : recent;
}

/** A day of a scan stored before the cache counts were kept makes the hit rate of a range unknown, so it falls back to the all-time rate. */
export function rangeTotals(
  days: readonly PetDay[],
  from: string,
  fallbackHitRate: number,
) {
  let tokens = 0;
  let costUsd = 0;
  let cacheRead = 0;
  let promptTokens = 0;
  let isKnown = true;
  for (const d of days) {
    if (d.day < from) continue;
    tokens += d.tokens;
    costUsd += d.costUsd;
    if (d.cacheRead === undefined || d.promptTokens === undefined)
      isKnown = false;
    else {
      cacheRead += d.cacheRead;
      promptTokens += d.promptTokens;
    }
  }
  const cacheHitRate = !isKnown
    ? fallbackHitRate
    : promptTokens > 0
      ? cacheRead / promptTokens
      : 0;

  return { tokens, costUsd, cacheHitRate };
}
