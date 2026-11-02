import {
  instantOf,
  parseLocalTime,
} from "#src/assistant/calendar/ics/instant-of.ts";
import type { AgendaItem } from "./types.ts";

/** A calendar event as an agenda takes it, whichever reader found it. */
export interface AgendaEvent {
  title: string;
  allDay: boolean;
  /** `YYYY-MM-DDTHH:mm` in `timeZone`, or `YYYY-MM-DD` for an all-day event. */
  start: string;
  /** In `endTimeZone` when it has one, else in `timeZone`. */
  end: string | null;
  /** Null for an all-day event. */
  timeZone: string | null;
  endTimeZone?: string | null;
  location: string | null;
  note?: string | null;
}

function startOf({ start, timeZone }: AgendaEvent) {
  return instantOf(parseLocalTime(start), timeZone ?? "UTC");
}

/** Events as the page shows them: all-day events first, then in order of time. */
export function agendaItems(
  events: readonly AgendaEvent[],
  ownerZone: string,
): AgendaItem[] {
  return [...events]
    .sort(
      (a, b) =>
        Number(b.allDay) - Number(a.allDay) ||
        startOf(a) - startOf(b) ||
        a.title.localeCompare(b.title),
    )
    .map((event) => ({
      title: event.title,
      allDay: event.allDay,
      start: event.start,
      end:
        !event.endTimeZone || event.endTimeZone === event.timeZone
          ? event.end
          : null,
      timeZone:
        event.timeZone && event.timeZone !== ownerZone ? event.timeZone : null,
      location: event.location,
      note: event.note ?? null,
    }));
}
