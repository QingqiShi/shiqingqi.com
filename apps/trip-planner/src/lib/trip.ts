import type {
  Day,
  DayPresence,
  PersonSchedule,
  ResolvedDay,
} from "@/data/types";

/** Who is involved on a given day, in stable host-then-guest order. */
export function peopleOnDay(
  schedule: PersonSchedule[],
  dayN: number,
): DayPresence[] {
  return schedule
    .filter(
      (p) =>
        dayN >= p.range[0] && dayN <= p.range[1] && !p.away?.includes(dayN),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      initial: p.initial,
      kind: p.markers?.[dayN] ?? "present",
      via: p.via ?? "air",
    }));
}

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
