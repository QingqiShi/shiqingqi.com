import type { Day, ResolvedDay } from "@/trips/types";

const DAY_MS = 86_400_000;

/** The calendar date in a time zone, as "YYYY-MM-DD". */
export function dateInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Minutes past midnight on the clock of a time zone. */
export function minutesInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
}

/** Which day to land on, and where "now" is relative to the trip, on the
 *  trip's own clock. */
export function resolveDay(
  now: Date,
  days: Day[],
  timeZone: string,
): ResolvedDay {
  const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const today = toMs(dateInZone(now, timeZone));
  const first = toMs(days[0].date);
  const last = toMs(days[days.length - 1].date);

  if (today < first) {
    return {
      index: 0,
      phase: "before",
      daysUntil: Math.round((first - today) / DAY_MS),
    };
  }
  if (today > last) {
    return { index: days.length - 1, phase: "after", daysUntil: 0 };
  }
  const index = days.findIndex((day) => toMs(day.date) === today);
  return { index: index < 0 ? 0 : index, phase: "during", daysUntil: 0 };
}
