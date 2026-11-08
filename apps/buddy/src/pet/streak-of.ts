import { addDays } from "./local-time.ts";

export function streakOf(activeDays: readonly string[], today: string) {
  const active = new Set(activeDays);
  let day = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }

  return streak;
}

const LOST_LOOKBACK_DAYS = 6;

/** The streak that ended, when it ran more than 3 days and the current streak is 0 or 1. */
export function lostStreakOf(activeDays: readonly string[], today: string) {
  const active = new Set(activeDays);
  const streak = streakOf(activeDays, today);
  if (streak > 1) return null;
  let day =
    streak === 1 && !active.has(today)
      ? addDays(today, -2)
      : addDays(today, -1);
  for (let i = 0; i < LOST_LOOKBACK_DAYS && !active.has(day); i++)
    day = addDays(day, -1);
  const lost = streakOf(activeDays, addDays(day, 1));

  return lost > 3 ? lost : null;
}
