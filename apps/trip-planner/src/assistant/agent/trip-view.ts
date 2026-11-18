import { desc, eq } from "drizzle-orm";
import { tripRevisions } from "#src/db/schema.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { dayNumber } from "#src/trips/day-number.ts";
import { digest } from "#src/trips/ops/digest.ts";
import { dayLists } from "#src/trips/ops/find-item.ts";
import { tripSchema } from "#src/trips/trip-schema.ts";
import type { Day, Moment, Trip } from "#src/trips/types.ts";

/**
 * The version of a trip, which changes with each change to it. It is not
 * the revision: a save of the same author soon after goes into the same
 * revision (`trips_save`).
 */
function version(trip: Trip): string {
  return digest(trip);
}

/** The newest trip, for a member of it, or null. */
async function read(tx: Transaction, tripId: string): Promise<Trip | null> {
  const rows = await tx
    .select({ document: tripRevisions.document })
    .from(tripRevisions)
    .where(eq(tripRevisions.tripId, tripId))
    .orderBy(desc(tripRevisions.revision))
    .limit(1);
  const newest = rows.at(0);
  return newest ? tripSchema.parse(newest.document) : null;
}

const MAX_LINE_CHARS = 400;

function cut(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function momentLine(moment: Moment): string {
  const names = moment.items.map((item) => {
    switch (item.type) {
      case "flight":
        return `flight ${item.number}`;
      case "checklist":
      case "signSheet":
        return item.title;
      case "nav":
        return item.label;
      case "tip":
        return item.text;
      default:
        return item.name;
    }
  });
  const text = moment.text ? [moment.text] : [];
  return `${moment.time} ${[...text, ...names].join(", ")}`;
}

/** One line for a day: its number, id, date, title and what it holds. */
function outlineLine(trip: Trip, day: Day, index: number): string {
  const moments = day.moments.map(momentLine);
  const lists = dayLists(day)
    .filter(({ items }) => items.length > 0)
    .map(({ list, items }) => `${list}: ${String(items.length)}`);
  const parts = [
    `Day ${String(dayNumber(trip, index))}`,
    `id "${day.id}"`,
    day.date,
    ...(day.title ? [day.title] : []),
    ...(moments.length > 0 ? [moments.join("; ")] : []),
    ...(lists.length > 0 ? [`lists: ${lists.join(", ")}`] : []),
  ];
  return cut(parts.join(" · "), MAX_LINE_CHARS);
}

/** What `read_trip` gives with no days: the trip in short, one line per day. */
function outline(trip: Trip) {
  return {
    version: version(trip),
    title: trip.title,
    subtitle: trip.subtitle,
    party: trip.party,
    timeZone: trip.timeZone,
    people: trip.people.map((person) => ({
      id: person.id,
      name: person.name,
    })),
    days: trip.days.map((day, index) => outlineLine(trip, day, index)),
  };
}

/** What `read_trip` gives for some days: each whole, with the ids that ops name, and who is there. */
function days(trip: Trip, dayIds: readonly string[]) {
  const wanted = new Set(dayIds);
  return {
    version: version(trip),
    days: trip.days.flatMap((day, index) =>
      wanted.has(day.id)
        ? [
            {
              day: dayNumber(trip, index),
              ...day,
              people: trip.people.map((person) => ({
                id: person.id,
                name: person.name,
                presence: person.days[day.id] ?? null,
              })),
            },
          ]
        : [],
    ),
    unknownDayIds: dayIds.filter(
      (id) => !trip.days.some((day) => day.id === id),
    ),
  };
}

/** The trip as the assistant reads it, as the asker. */
export const tripView = { version, read, outline, days };
