import type { Day, ResolvedDay } from "@/data/types";

/** Work out which day to land on given "now", and where we are relative to the trip. */
export function resolveDay(now: Date, list: Day[]): ResolvedDay {
  const dayMs = 86_400_000;
  const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const first = toUtc(list[0].date);
  const last = toUtc(list[list.length - 1].date);

  if (today < first) {
    return {
      index: 0,
      phase: "before",
      daysUntil: Math.round((first - today) / dayMs),
    };
  }
  if (today > last) {
    return { index: list.length - 1, phase: "after", daysUntil: 0 };
  }
  const index = list.findIndex((d) => toUtc(d.date) === today);
  return { index: index < 0 ? 0 : index, phase: "during", daysUntil: 0 };
}
