import { eventsInRange } from "#src/assistant/calendar/ics/events-in-range.ts";
import {
  readIcsEvents,
  repeats,
  type IcsEvent,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import type { AgendaEvent } from "#src/assistant/report/agenda-items.ts";
import { localDayBounds } from "#src/assistant/report/local-day-bounds.ts";
import { eventKey, occurrenceOf } from "./event-handles.ts";
import type { RunCalendars } from "./run-calendars.ts";

/** An event of the day, with what names it across reads of the calendar. */
interface DayEvent extends AgendaEvent {
  key: string;
}

/**
 * An all-day event starts at 00:00 UTC of its first day, so a range of
 * instants in another zone also finds the event of the day before or after.
 * Its own dates say if it is on `day`.
 */
function isOn(event: IcsEvent, day: string) {
  if (!event.allDay) return true;
  return event.startLocal <= day && day <= (event.endLocal ?? event.startLocal);
}

/**
 * The events on a local day, with each occurrence of a repeating event and
 * no cancelled event. It throws when any account or calendar fails, because an
 * agenda with events missing looks complete.
 */
export async function readDayEvents(
  calendars: RunCalendars,
  day: string,
  timeZone: string,
): Promise<DayEvent[]> {
  const { calendars: list, unavailable } = await calendars.load();
  if (unavailable.length > 0) {
    throw new Error("An iCloud account did not log in");
  }
  const bounds = localDayBounds(day, timeZone);
  const range = { start: bounds.start.getTime(), end: bounds.end.getTime() };
  const objects = await Promise.all(
    list.map(async (calendar) => {
      const session = await calendars.session(calendar);
      return session.listEvents(calendar.url, bounds);
    }),
  );
  return objects.flat().flatMap((object) => {
    const events = readIcsEvents(object.data, timeZone);
    const objectRepeats = repeats(events);
    return eventsInRange(events, range)
      .filter((event) => !event.cancelled && isOn(event, day))
      .map((event) => ({
        ...event,
        start: event.startLocal,
        end: event.endLocal,
        key: eventKey({
          url: object.url,
          occurrence: occurrenceOf(objectRepeats, event),
        }),
      }));
  });
}

/** What the read gives, or a rejection when it takes longer than `ms`. */
export async function withinTime<T>(read: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("The calendar took too long"));
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
