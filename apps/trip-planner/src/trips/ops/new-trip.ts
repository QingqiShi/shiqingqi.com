import { z } from "zod";
import { isTimeZone, TRIP_SCHEMA_VERSION, tripSchema } from "../trip-schema.ts";
import type { Trip } from "../types.ts";
import { addDays } from "./add-days.ts";
import { newId } from "./new-id.ts";

/** What a person gives to make a trip. */
export const newTripSchema = z.strictObject({
  title: z.string().trim().min(1),
  firstDate: z.iso.date(),
  // A trip gets more days with `addDay`. The maximum stops a small request
  // that makes the server build a document without end.
  days: z.number().int().min(1).max(1000),
  timeZone: z.string().refine(isTimeZone, "Unknown time zone"),
  language: z.enum(["en", "zh"]),
});
export type NewTrip = z.infer<typeof newTripSchema>;

/** A trip with a title and one empty day for each date from the first date. */
export function newTrip(input: NewTrip): Trip {
  return tripSchema.parse({
    schemaVersion: TRIP_SCHEMA_VERSION,
    id: newId(),
    title: input.title,
    language: input.language,
    timeZone: input.timeZone,
    firstDayNumber: 1,
    people: [],
    days: Array.from({ length: input.days }, (_, i) => ({
      id: newId(),
      date: addDays(input.firstDate, i),
      moments: [],
      tips: [],
      dining: [],
      places: [],
      stay: { lodging: [] },
    })),
  });
}
