import ICAL from "ical.js";
import {
  formatLocalTime,
  instantOf,
  localTimeAt,
  type LocalTime,
} from "./instant-of.ts";
import type { IcsEvent } from "./read-ics-events.ts";

const DAY = 24 * 60 * 60 * 1000;
/** Enough for a daily event that started decades ago. */
const MAX_STEPS = 50_000;

export interface InstantRange {
  start: number;
  end: number;
}

function overlaps(event: Pick<IcsEvent, "start" | "end">, range: InstantRange) {
  const end = Math.max(event.end ?? event.start, event.start + 1);
  return event.start < range.end && end > range.start;
}

function localOf(time: ICAL.Time): LocalTime {
  return {
    year: time.year,
    month: time.month,
    day: time.day,
    hour: time.hour,
    minute: time.minute,
    second: time.second,
  };
}

/** The typings of ical.js say Time, but `next()` gives null when the rule ends. */
function nextOf(iterator: { next: () => ICAL.Time | null }) {
  return iterator.next();
}

/** A UNTIL as a wall-clock time in the zone the rule counts in, as the iterator compares it. */
function untilIn(until: ICAL.Time, zone: string, allDay: boolean) {
  if (until.isDate || until.zone.tzid !== "UTC") return until;
  const local = localTimeAt(instantOf(localOf(until), "UTC"), zone);
  return ICAL.Time.fromData({ ...local, isDate: allDay });
}

/** The starts of a repeating event before `range.end`, without its exceptions. */
function startsOf(event: IcsEvent, range: InstantRange): number[] {
  const { repeat } = event;
  if (!repeat) return [event.start];
  const instant = (local: LocalTime) =>
    event.allDay ? instantOf(local, "UTC") : instantOf(local, repeat.zone);
  const starts = new Set([event.start, ...repeat.dates]);
  if (repeat.rule) {
    const rule = ICAL.Recur.fromString(repeat.rule);
    if (rule.until) rule.until = untilIn(rule.until, repeat.zone, event.allDay);
    const iterator = rule.iterator(
      ICAL.Time.fromData({ ...repeat.local, isDate: event.allDay }),
    );
    for (let step = 0; step < MAX_STEPS; step += 1) {
      const next = nextOf(iterator);
      if (!next) break;
      const start = instant(localOf(next));
      if (start >= range.end) break;
      starts.add(start);
    }
  }
  for (const exception of repeat.exceptions) starts.delete(exception);
  return [...starts];
}

/** One occurrence of a repeating event, at its own start. */
function occurrence(event: IcsEvent, start: number): IcsEvent {
  if (start === event.start) return event;
  const end = event.end === null ? null : start + event.end - event.start;
  if (event.allDay) {
    return {
      ...event,
      start,
      end,
      startLocal: formatLocalTime(localTimeAt(start, "UTC"), false),
      endLocal:
        end === null
          ? null
          : formatLocalTime(localTimeAt(end - DAY, "UTC"), false),
    };
  }
  const zone = event.timeZone ?? "UTC";
  return {
    ...event,
    start,
    end,
    startLocal: formatLocalTime(localTimeAt(start, zone), true),
    endLocal:
      end === null
        ? null
        : formatLocalTime(localTimeAt(end, event.endTimeZone ?? zone), true),
  };
}

/**
 * The events of one iCalendar object (from `readIcsEvents`) that overlap
 * the range, with each occurrence of a repeating event at its own start.
 * A changed instance (RECURRENCE-ID) takes the place of the occurrence it
 * changes, and an EXDATE removes one.
 */
export function eventsInRange(
  events: readonly IcsEvent[],
  range: InstantRange,
): IcsEvent[] {
  const changed = new Set(
    events.flatMap((event) =>
      event.recurrenceId === null
        ? []
        : [`${event.uid ?? ""}\u0000${String(event.recurrenceId)}`],
    ),
  );
  const found: IcsEvent[] = [];
  for (const event of events) {
    if (!event.repeat || event.recurrenceId !== null) {
      if (overlaps(event, range)) found.push(event);
      continue;
    }
    const length = event.end === null ? null : event.end - event.start;
    for (const start of startsOf(event, range)) {
      if (changed.has(`${event.uid ?? ""}\u0000${String(start)}`)) continue;
      const end = length === null ? null : start + length;
      if (overlaps({ start, end }, range)) found.push(occurrence(event, start));
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
