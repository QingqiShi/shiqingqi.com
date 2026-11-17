import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Day, Trip } from "#src/trips/types.ts";

type Repeat = { dayId: string; label: string } | null;

/** The id of the day whose bed a day has: its own id, or the day at the end of its repeats. */
function bedOf(trip: Trip, day: Day): string {
  const seen = new Set<string>();
  let current = day;
  while (current.stay.sameAs && !seen.has(current.id)) {
    seen.add(current.id);
    const next = trip.days.find(
      (each) => each.id === current.stay.sameAs?.dayId,
    );
    if (!next) break;
    current = next;
  }
  return current.id;
}

const repeats = (trip: Trip, day: Day, dayId: string) =>
  day.id !== dayId && bedOf(trip, day) === dayId;

/** The days after a day, in the order of the trip. */
function daysAfter(trip: Trip, dayId: string): Day[] {
  const at = trip.days.findIndex((day) => day.id === dayId);
  return at < 0 ? [] : trip.days.slice(at + 1);
}

/** How many nights in a row have the bed of a day, with the night of that day. */
export function nightsAt(trip: Trip, dayId: string): number {
  const later = daysAfter(trip, dayId);
  const end = later.findIndex((day) => !repeats(trip, day, dayId));
  return 1 + (end < 0 ? later.length : end);
}

/**
 * The most nights in a row that the bed of a day can have: it stops at the
 * next day with a stay of its own. The stay with `movedId` does not count,
 * because it is the stay that goes to the day.
 */
export function mostNightsAt(
  trip: Trip,
  dayId: string,
  movedId?: string,
): number {
  const later = daysAfter(trip, dayId);
  const end = later.findIndex((day) =>
    day.stay.lodging.some((lodging) => lodging.id !== movedId),
  );
  return 1 + (end < 0 ? later.length : end);
}

const toOps = (plan: Map<string, Repeat>): DraftOp[] =>
  [...plan].map(([dayId, sameAs]) => ({
    op: "setStay",
    dayId,
    fields: { sameAs },
  }));

/** Each night that repeats a day has no bed any more. */
function endRepeats(trip: Trip, dayId: string, plan: Map<string, Repeat>) {
  for (const day of trip.days) {
    if (repeats(trip, day, dayId)) plan.set(day.id, null);
  }
}

interface StayNights {
  /** The day that has the stay. */
  dayId: string;
  /** How many nights in a row the stay lasts, with the night of its day. */
  nights: number;
  /** The name of the stay. It is the label of each night that repeats the day. */
  name: string;
  /** The name of the stay before the change, if it had one. */
  earlierName?: string;
  /** The day that the stay goes away from, if that day has no stay after it. */
  leftDayId?: string;
}

/**
 * The ops that make the stay of a day last a number of nights in a row. The
 * day has a bed of its own. Each later night in that number repeats the day.
 * A night after them that repeated the day has no bed any more, and neither
 * has a night that repeated the day that the stay left. A label that a
 * person wrote stays, unless it was the earlier name. Each day gets one op
 * at most, because each op must agree with the trip as it is before them all.
 */
export function stayNightsOps(
  trip: Trip,
  { dayId, nights, name, earlierName, leftDayId }: StayNights,
): DraftOp[] {
  const plan = new Map<string, Repeat>();
  if (leftDayId) endRepeats(trip, leftDayId, plan);
  if (trip.days.find((day) => day.id === dayId)?.stay.sameAs) {
    plan.set(dayId, null);
  }
  for (const [index, day] of daysAfter(trip, dayId).entries()) {
    const { sameAs } = day.stay;
    if (index + 1 < nights) {
      const isStale =
        sameAs?.dayId !== dayId ||
        (sameAs.label === earlierName && earlierName !== name);
      if (isStale) plan.set(day.id, { dayId, label: name });
      else plan.delete(day.id);
    } else if (repeats(trip, day, dayId)) {
      plan.set(day.id, null);
    } else {
      break;
    }
  }
  return toOps(plan);
}

/** The ops that end each repeat of the bed of a day, for when the day has no stay any more. */
export function endRepeatsOps(trip: Trip, dayId: string): DraftOp[] {
  const plan = new Map<string, Repeat>();
  endRepeats(trip, dayId, plan);
  return toOps(plan);
}
