import type { CalendarObject } from "#src/assistant/calendar/caldav/types.ts";
import { ASSISTANT_UID_DOMAIN } from "#src/assistant/calendar/ics/build-event-ics.ts";
import {
  repeats,
  type IcsEvent,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import { occurrenceOf, type EventHandles } from "./event-handles.ts";
import type { RunCalendar } from "./run-calendars.ts";

function madeByAssistant(event: IcsEvent) {
  return event.uid?.endsWith(ASSISTANT_UID_DOMAIN) ?? false;
}

/**
 * What the model sees of an event, or of one occurrence of a repeating
 * event, with what the other events of its object add: never its notes,
 * which can hold text from other people.
 */
export function eventView(
  id: string,
  calendar: RunCalendar,
  event: IcsEvent,
  events: IcsEvent[],
) {
  return {
    id,
    calendar: calendar.key,
    title: event.title,
    start: event.startLocal,
    end: event.endLocal,
    allDay: event.allDay,
    timeZone: event.timeZone,
    endTimeZone:
      event.endTimeZone !== event.timeZone ? event.endTimeZone : undefined,
    location: event.location,
    recurring: repeats(events),
    withAttendees: events.some((entry) => entry.hasAttendees),
    cancelled: event.cancelled,
    madeByAssistant: madeByAssistant(event),
  };
}

/** The id of an event, or of one occurrence of a repeating event. */
export function register(
  handles: EventHandles,
  calendar: RunCalendar,
  object: CalendarObject,
  event: IcsEvent,
  events: IcsEvent[],
) {
  const id = handles.register({
    calendarKey: calendar.key,
    url: object.url,
    etag: object.etag,
    title: event.title,
    occurrence: occurrenceOf(repeats(events), event),
  });
  return eventView(id, calendar, event, events);
}
