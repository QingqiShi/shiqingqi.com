import type { MailEvent } from "#src/assistant/classify/types.ts";
import type { UserLocale } from "#src/assistant/db/schema.ts";
import {
  addDays,
  addMinutes,
  instantOf,
  parseLocalTime,
  type LocalTime,
} from "./instant-of.ts";

/** When an entry happens: whole days, or a span of wall-clock time in one zone. */
export type EntryTiming =
  | {
      allDay: true;
      startDate: LocalTime;
      /** The day after the last day. */
      endDate: LocalTime;
    }
  | { allDay: false; start: LocalTime; end: LocalTime; timeZone: string };

/** A calendar entry as the app writes it. */
export interface CalendarEntry {
  title: string;
  timing: EntryTiming;
  location: string | null;
  /** iCalendar durations before (negative) or after the start, such as `-PT1H`. */
  alarms: string[];
}

/** A deadline without a time becomes an entry at this local time on its due day. */
const DEADLINE_HOUR = 9;
const DEADLINE_MINUTES = 30;
const DEFAULT_MINUTES = 60;

const TIMED_ALARMS = ["-PT1H", "-PT30M", "-PT10M"];
const TRAVEL_ALARMS = ["-PT3H", "-PT1H", "-PT30M"];
/** The day before at the same time, and at the start. */
const DEADLINE_ALARMS = ["-P1D", "PT0S"];
/** 09:00 on the day before an all-day entry. */
const ALL_DAY_ALARMS = ["-PT15H"];

const TODO_PREFIX: Record<UserLocale, string> = {
  en: "To do: ",
  zh: "待办：",
};

function timedEnd(event: MailEvent, start: LocalTime, minutes: number) {
  if (event.end && event.end > event.start) return parseLocalTime(event.end);
  return addMinutes(start, minutes);
}

/**
 * What the app writes for an event. Travel gets earlier alarms, a deadline
 * is titled as a to-do, and a deadline without a time is put at 09:00 on
 * its due day.
 */
export function entryOfEvent(
  event: MailEvent,
  locale: UserLocale,
): CalendarEntry {
  const isDeadline = event.kind === "deadline";
  const title = isDeadline
    ? `${TODO_PREFIX[locale]}${event.title}`
    : event.title;
  if (isDeadline && event.allDay) {
    const start = {
      ...parseLocalTime(event.start),
      hour: DEADLINE_HOUR,
      minute: 0,
    };
    return {
      title,
      timing: {
        allDay: false,
        start,
        end: addMinutes(start, DEADLINE_MINUTES),
        timeZone: event.timeZone,
      },
      location: event.location,
      alarms: DEADLINE_ALARMS,
    };
  }
  if (event.allDay) {
    const startDate = parseLocalTime(event.start);
    return {
      title,
      timing: {
        allDay: true,
        startDate,
        endDate: addDays(parseLocalTime(event.end ?? event.start), 1),
      },
      location: event.location,
      alarms: ALL_DAY_ALARMS,
    };
  }
  const start = parseLocalTime(event.start);
  return {
    title,
    timing: {
      allDay: false,
      start,
      end: timedEnd(event, start, DEFAULT_MINUTES),
      timeZone: event.timeZone,
    },
    location: event.location,
    alarms: event.kind === "travel" ? TRAVEL_ALARMS : TIMED_ALARMS,
  };
}

/** The span of an entry in epoch milliseconds. An all-day entry spans its days in every zone on earth. */
export function spanOfEntry(timing: EntryTiming): {
  start: number;
  end: number;
} {
  if (!timing.allDay) {
    return {
      start: instantOf(timing.start, timing.timeZone),
      end: instantOf(timing.end, timing.timeZone),
    };
  }
  const hours14 = 14 * 60 * 60 * 1000;
  return {
    start: instantOf(timing.startDate, "UTC") - hours14,
    end: instantOf(timing.endDate, "UTC") + hours14,
  };
}
