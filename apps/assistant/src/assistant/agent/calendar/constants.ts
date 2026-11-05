import { z } from "zod";

export const DAY = 24 * 60 * 60 * 1000;
export const MINUTE = 60_000;
const MAX_REASON_CHARS = 300;

export const calendarKey = z
  .string()
  .describe('A calendar key from list_calendars, such as "c1".');
export const eventId = z
  .string()
  .describe('An event id from list_events or create_event, such as "e3".');
export const reason = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REASON_CHARS)
  .describe("Why, in one short line the owner will read in the activity log.");
export const fromMail = z
  .string()
  .optional()
  .describe('The id of the mail the event comes from, such as "m12".');
export const timeFields = {
  start: z
    .string()
    .describe(
      "Local time at the place, YYYY-MM-DDTHH:mm; for an all-day event, the first day, YYYY-MM-DD.",
    ),
  end: z
    .string()
    .optional()
    .describe(
      "In the same form. For an all-day event, the last day. Default: an hour after the start, or the start day.",
    ),
  allDay: z.boolean(),
  timeZone: z
    .string()
    .optional()
    .describe(
      "The IANA zone of the start, such as Europe/London. Default: the owner's zone.",
    ),
  endTimeZone: z
    .string()
    .optional()
    .describe(
      "The IANA zone of the end when it is not that of the start, such as the zone of the arrival airport.",
    ),
};
export const detailFields = {
  location: z.string().max(200).optional(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Short notes, such as the booking reference, seat or gate."),
  alarmMinutes: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(28 * 24 * 60),
    )
    .max(4)
    .optional()
    .describe(
      "Alarms, in minutes before the start. Default: 60, 30 and 10 for a timed event; 900 (09:00 the day before) for an all-day one.",
    ),
};
