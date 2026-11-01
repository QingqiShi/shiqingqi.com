import { CalendarAuthError } from "../caldav/calendar-auth-error.ts";
import { CalendarRequestError } from "../caldav/calendar-request-error.ts";
import type { CalendarConnector, CalendarObject } from "../caldav/types.ts";
import { readIcsEvents } from "../ics/read-ics-events.ts";

interface FakeCalendar {
  url: string;
  displayName: string;
  objects: Map<string, { etag: string; data: string }>;
}

/** A command that changed a calendar. */
export interface FakeCalendarWrite {
  command: "mkcalendar" | "create" | "update" | "delete";
  url: string;
}

const HOME = "https://caldav.example/home/";

/**
 * An in-memory CalDAV account. `connector` logs in with `password`; set
 * `failNextWrites` to make the next writes fail with a 500.
 */
export function createFakeCalendarServer({
  user,
  password,
}: {
  user: string;
  password: string;
}) {
  const calendars = new Map<string, FakeCalendar>();
  const writes: FakeCalendarWrite[] = [];
  let etags = 0;
  let calendarCount = 0;
  const state = { logins: 0, failNextWrites: 0 };

  function calendarOf(url: string) {
    const calendar = [...calendars.values()].find((entry) =>
      url.startsWith(entry.url),
    );
    if (!calendar) throw new CalendarRequestError("REQUEST", 404);
    return calendar;
  }

  function nextEtag() {
    etags += 1;
    return `"${String(etags)}"`;
  }

  function write(command: FakeCalendarWrite["command"], url: string) {
    if (state.failNextWrites > 0) {
      state.failNextWrites -= 1;
      throw new CalendarRequestError("PUT", 500);
    }
    writes.push({ command, url });
  }

  function addCalendar(displayName: string) {
    calendarCount += 1;
    const url = `${HOME}calendar-${String(calendarCount)}/`;
    calendars.set(url, { url, displayName, objects: new Map() });
    return url;
  }

  const connector: CalendarConnector = (auth) => {
    if (auth.user !== user || auth.pass !== password) {
      return Promise.reject(new CalendarAuthError());
    }
    state.logins += 1;
    return Promise.resolve({
      listCalendars: () =>
        Promise.resolve(
          [...calendars.values()].map(({ url, displayName }) => ({
            url,
            displayName,
          })),
        ),
      createCalendar: (displayName) => {
        const url = `${HOME}calendar-${String(calendarCount + 1)}/`;
        write("mkcalendar", url);
        addCalendar(displayName);
        return Promise.resolve({ url, displayName });
      },
      listEvents: (calendarUrl, range) => {
        const calendar = calendars.get(calendarUrl);
        if (!calendar) throw new CalendarRequestError("REPORT", 404);
        const found: CalendarObject[] = [];
        for (const [url, object] of calendar.objects) {
          const overlaps = readIcsEvents(object.data, "UTC").some((event) => {
            const end = event.end ?? event.start + 1;
            return (
              event.start < range.end.getTime() && end > range.start.getTime()
            );
          });
          if (overlaps) found.push({ url, ...object });
        }
        return Promise.resolve(found);
      },
      getEvent: (url) => {
        const object = calendarOf(url).objects.get(url);
        return Promise.resolve(object ? { url, ...object } : null);
      },
      createEvent: (calendarUrl, filename, data) => {
        const calendar = calendarOf(calendarUrl);
        const url = new URL(filename, calendarUrl).href;
        if (calendar.objects.has(url)) {
          throw new CalendarRequestError("PUT", 412);
        }
        write("create", url);
        calendar.objects.set(url, { etag: nextEtag(), data });
        return Promise.resolve({ url });
      },
      updateEvent: (url, data, etag) => {
        const calendar = calendarOf(url);
        const current = calendar.objects.get(url);
        if (etag !== null && current?.etag !== etag) {
          throw new CalendarRequestError("PUT", 412);
        }
        write("update", url);
        calendar.objects.set(url, { etag: nextEtag(), data });
        return Promise.resolve();
      },
      deleteEvent: (url, etag) => {
        const calendar = calendarOf(url);
        const current = calendar.objects.get(url);
        if (etag !== null && current && current.etag !== etag) {
          throw new CalendarRequestError("DELETE", 412);
        }
        write("delete", url);
        calendar.objects.delete(url);
        return Promise.resolve();
      },
    });
  };

  return {
    connector,
    state,
    writes,
    /** Adds a calendar of the user's own; returns its URL. */
    addCalendar,
    /** Puts an event into a calendar, as another app would. */
    putEvent(calendarUrl: string, filename: string, data: string) {
      const calendar = calendarOf(calendarUrl);
      const url = new URL(filename, calendarUrl).href;
      calendar.objects.set(url, { etag: nextEtag(), data });
      return url;
    },
    calendars: () => [...calendars.values()],
    events(calendarUrl: string) {
      return [...(calendars.get(calendarUrl)?.objects ?? new Map())].map(
        ([url, object]: [string, { etag: string; data: string }]) => ({
          url,
          ...object,
        }),
      );
    },
  };
}

export type FakeCalendarServer = ReturnType<typeof createFakeCalendarServer>;
