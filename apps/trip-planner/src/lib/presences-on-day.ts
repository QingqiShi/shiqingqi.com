import type { DayPresence, PersonSchedule } from "@/data/types";

/** The Party presences on a given day, in stable host-then-guest order. */
export function presencesOnDay(
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
