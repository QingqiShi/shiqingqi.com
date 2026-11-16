import { DAY_PARTS } from "#src/trips/day-parts.ts";
import type { DayPart, MomentTime } from "#src/trips/types.ts";

/** A representative clock time for each part of the day, in minutes. */
const PART_MINUTES: Record<DayPart, number> = {
  dawn: 4 * 60,
  "early-morning": 5 * 60 + 30,
  morning: 7 * 60,
  "late-morning": 9 * 60,
  daytime: 10 * 60,
  noon: 12 * 60,
  "early-afternoon": 13 * 60 + 30,
  afternoon: 14 * 60,
  dusk: 18 * 60,
  evening: 20 * 60,
  night: 22 * 60,
  "late-night": 23 * 60,
};

/** Minutes past midnight, for ordering. A backup plan sorts after the day. */
export function momentMinutes(time: MomentTime): number {
  if (time === "backup") return 30 * 60;
  const part = DAY_PARTS.find((value) => value === time);
  if (part) return PART_MINUTES[part];
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}
