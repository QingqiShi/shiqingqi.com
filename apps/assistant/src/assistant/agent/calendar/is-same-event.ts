import {
  spanOfTiming,
  type EventTiming,
} from "#src/assistant/calendar/ics/build-event-ics.ts";
import {
  addDays,
  formatLocalTime,
  instantOf,
} from "#src/assistant/calendar/ics/instant-of.ts";
import type { IcsEvent } from "#src/assistant/calendar/ics/read-ics-events.ts";
import { MINUTE } from "./constants.ts";

/** Two events whose titles match and whose starts are this close are the same event. */
export const SAME_START_MS = 5 * MINUTE;

function normalTitle(title: string) {
  return title.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

function hasSameTitleAndStart(
  timing: EventTiming,
  title: string,
  other: IcsEvent,
) {
  if (normalTitle(other.title) !== normalTitle(title)) return false;
  if (timing.allDay) {
    const date = instantOf(timing.startDate, "UTC");
    return other.allDay && other.start === date;
  }
  const start = instantOf(timing.start, timing.timeZone);
  return !other.allDay && Math.abs(other.start - start) <= SAME_START_MS;
}

/** When an event happens, in the days of an all-day event or the instants and local start day of a timed one. */
type Occasion =
  | { allDay: true; firstDay: string; lastDay: string }
  | { allDay: false; start: number; end: number; day: string };

function occasionOfTiming(timing: EventTiming): Occasion {
  if (timing.allDay) {
    return {
      allDay: true,
      firstDay: formatLocalTime(timing.startDate, false),
      lastDay: formatLocalTime(addDays(timing.endDate, -1), false),
    };
  }
  const span = spanOfTiming(timing);
  return {
    allDay: false,
    ...span,
    day: formatLocalTime(timing.start, false),
  };
}

function occasionOfEvent(event: IcsEvent): Occasion {
  const firstDay = event.startLocal.slice(0, 10);
  if (event.allDay) {
    return {
      allDay: true,
      firstDay,
      lastDay: event.endLocal ?? firstDay,
    };
  }
  return {
    allDay: false,
    start: event.start,
    end: Math.max(event.end ?? event.start, event.start + MINUTE),
    day: firstDay,
  };
}

/**
 * Timed events that overlap, all-day events that share a day, or a timed
 * event on the day of a one-day event, such as a deadline. A stay of some
 * days and a flight on its first day are not at the same time.
 */
function atSameTime(a: Occasion, b: Occasion): boolean {
  if (a.allDay && b.allDay) {
    return a.firstDay <= b.lastDay && b.firstDay <= a.lastDay;
  }
  if (!a.allDay && !b.allDay) return a.start < b.end && b.start < a.end;
  const day = a.allDay ? a : b;
  const timed = a.allDay ? b : a;
  return (
    day.allDay &&
    !timed.allDay &&
    day.firstDay === day.lastDay &&
    timed.day === day.firstDay
  );
}

/**
 * The same event said again: the same title at the same start, or another
 * event from the same mail at the same time, such as one deadline under two
 * titles.
 */
export function isSameEvent(
  timing: EventTiming,
  title: string,
  sourceMessageId: string | null,
  other: IcsEvent,
) {
  if (hasSameTitleAndStart(timing, title, other)) return true;
  return (
    sourceMessageId !== null &&
    other.sourceMessageId === sourceMessageId &&
    atSameTime(occasionOfTiming(timing), occasionOfEvent(other))
  );
}
