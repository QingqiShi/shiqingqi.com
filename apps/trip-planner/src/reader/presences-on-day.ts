import type { DayPresence, Person } from "@/trips/types";

/** The people taking part on a given day, in the trip's order. */
export function presencesOnDay(people: Person[], dayId: string): DayPresence[] {
  return people.flatMap((person) => {
    if (!(dayId in person.days)) return [];
    const kind = person.days[dayId];
    return [
      {
        id: person.id,
        name: person.name,
        initial: person.initial,
        kind,
        via: person.via,
      },
    ];
  });
}
