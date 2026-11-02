import { CalendarAuthError } from "../caldav/calendar-auth-error.ts";
import { CalendarRequestError } from "../caldav/calendar-request-error.ts";
import type { CalendarConnector, CalendarObject } from "../caldav/types.ts";
import { eventsInRange } from "../ics/events-in-range.ts";
import { readIcsEvents } from "../ics/read-ics-events.ts";

interface FakeCalendar {
  url: string;
  displayName: string;
  isDefault: boolean;
  shared: boolean;
  objects: Map<string, { etag: string; data: string }>;
}

/** A command that changed a calendar. */
export interface FakeCalendarWrite {
  command: "create" | "update" | "delete";
  url: string;
}

const HOME = "https://caldav.example/home/";

/**
 * An in-memory CalDAV account. `connector` logs in with `password`; set
 * `failNextWrites` to make the next writes fail with a 500. Like a CalDAV
 * time-range query, `listEvents` finds a repeating event when one of its
 * occurrences is in the range.
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
  /** Every login name the connector was asked for, also refused ones. */
  const loginUsers: string[] = [];
  const state = { loginUsers, failNextWrites: 0 };

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

  function addCalendar(
    displayName: string,
    { isDefault = false, shared = false } = {},
  ) {
    calendarCount += 1;
    const url = `${HOME}calendar-${String(calendarCount)}/`;
    calendars.set(url, {
      url,
      displayName,
      isDefault,
      shared,
      objects: new Map(),
    });
    return url;
  }

  const connector: CalendarConnector = (auth) => {
    state.loginUsers.push(auth.user);
    if (auth.user !== user || auth.pass !== password) {
      return Promise.reject(new CalendarAuthError());
    }
    return Promise.resolve({
      listCalendars: () =>
        Promise.resolve(
          [...calendars.values()].map(
            ({ url, displayName, isDefault, shared }) => ({
              url,
              displayName,
              isDefault,
              shared,
            }),
          ),
        ),
      listEvents: (calendarUrl, range) => {
        const calendar = calendars.get(calendarUrl);
        if (!calendar) throw new CalendarRequestError("REPORT", 404);
        const found: CalendarObject[] = [];
        for (const [url, object] of calendar.objects) {
          const overlapping = eventsInRange(readIcsEvents(object.data, "UTC"), {
            start: range.start.getTime(),
            end: range.end.getTime(),
          });
          if (overlapping.length > 0) found.push({ url, ...object });
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
        const etag = nextEtag();
        calendar.objects.set(url, { etag, data });
        return Promise.resolve({ url, etag });
      },
      updateEvent: (url, data, etag) => {
        const calendar = calendarOf(url);
        const current = calendar.objects.get(url);
        if (etag !== null && current?.etag !== etag) {
          throw new CalendarRequestError("PUT", 412);
        }
        write("update", url);
        const next = nextEtag();
        calendar.objects.set(url, { etag: next, data });
        return Promise.resolve({ etag: next });
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
    /** Adds a calendar; returns its URL. */
    addCalendar,
    /** Puts an event into a calendar, as another app or the owner would; returns its URL. */
    putEvent(calendarUrl: string, filename: string, data: string) {
      const calendar = calendarOf(calendarUrl);
      const url = new URL(filename, calendarUrl).href;
      calendar.objects.set(url, { etag: nextEtag(), data });
      return url;
    },
    events(calendarUrl: string): CalendarObject[] {
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
