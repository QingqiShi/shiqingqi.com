import { randomUUID } from "node:crypto";
import {
  createAccount,
  createObject,
  deleteObject,
  fetchCalendarObjects,
  fetchCalendars,
  makeCalendar,
  updateObject,
  type DAVAccount,
} from "tsdav";
import { CalendarAuthError } from "./calendar-auth-error.ts";
import { CalendarRequestError } from "./calendar-request-error.ts";
import type {
  CalendarAuth,
  CalendarConnector,
  CalendarObject,
  CalendarSession,
} from "./types.ts";

export const ICLOUD_CALDAV_URL = "https://caldav.icloud.com/";
const REQUEST_TIMEOUT_MS = 20_000;
const ICS_TYPE = "text/calendar; charset=utf-8";

function isIcloudUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    (url.hostname === "icloud.com" || url.hostname.endsWith(".icloud.com"))
  );
}

/**
 * A fetch that adds the login to requests to iCloud and to no other host,
 * so that an href from a server answer cannot take the password elsewhere.
 * A 401 answer throws `CalendarAuthError`.
 */
function authorisedFetch(auth: CalendarAuth): typeof fetch {
  const authorization = `Basic ${Buffer.from(`${auth.user}:${auth.pass}`).toString("base64")}`;
  return async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
    );
    if (!isIcloudUrl(url)) {
      throw new Error(`Refused a calendar request to ${url.hostname}`);
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", authorization);
    const response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 401) throw new CalendarAuthError();
    return response;
  };
}

function displayNameOf(value: unknown) {
  return typeof value === "string" ? value : "";
}

function checked(method: string, response: Response) {
  if (!response.ok) throw new CalendarRequestError(method, response.status);
  return response;
}

function session(account: DAVAccount, request: typeof fetch): CalendarSession {
  return {
    async listCalendars() {
      const calendars = await fetchCalendars({ account, fetch: request });
      return calendars
        .filter(
          (calendar) =>
            !calendar.components || calendar.components.includes("VEVENT"),
        )
        .map((calendar) => ({
          url: calendar.url,
          displayName: displayNameOf(calendar.displayName),
        }));
    },

    async createCalendar(displayName) {
      const url = new URL(`${randomUUID()}/`, account.homeUrl).href;
      const response = (
        await makeCalendar({
          url,
          props: {
            "d:displayname": displayName,
            "c:supported-calendar-component-set": {
              "c:comp": { _attributes: { name: "VEVENT" } },
            },
          },
          fetch: request,
        })
      ).at(0);
      if (!response?.ok) {
        throw new CalendarRequestError("MKCALENDAR", response?.status ?? 0);
      }
      return { url, displayName };
    },

    async listEvents(calendarUrl, range) {
      const objects = await fetchCalendarObjects({
        calendar: { url: calendarUrl },
        timeRange: {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        },
        fetch: request,
      });
      return objects.flatMap((object): CalendarObject[] =>
        typeof object.data === "string"
          ? [
              {
                url: new URL(object.url, calendarUrl).href,
                etag: object.etag ?? null,
                data: object.data,
              },
            ]
          : [],
      );
    },

    async getEvent(url) {
      const response = await request(url, { method: "GET" });
      if (response.status === 404) return null;
      checked("GET", response);
      return {
        url,
        etag: response.headers.get("ETag"),
        data: await response.text(),
      };
    },

    async createEvent(calendarUrl, filename, data) {
      const url = new URL(filename, calendarUrl).href;
      checked(
        "PUT",
        await createObject({
          url,
          data,
          headers: { "content-type": ICS_TYPE, "If-None-Match": "*" },
          fetch: request,
        }),
      );
      return { url };
    },

    async updateEvent(url, data, etag) {
      checked(
        "PUT",
        await updateObject({
          url,
          data,
          etag: etag ?? undefined,
          headers: { "content-type": ICS_TYPE },
          fetch: request,
        }),
      );
    },

    async deleteEvent(url, etag) {
      const response = await deleteObject({
        url,
        etag: etag ?? undefined,
        fetch: request,
      });
      if (response.status !== 404) checked("DELETE", response);
    },
  };
}

/** iCloud CalDAV through tsdav, with the app-specific password of the iCloud mail account. */
export const tsdavConnector: CalendarConnector = async (auth) => {
  const request = authorisedFetch(auth);
  const account = await createAccount({
    account: {
      accountType: "caldav",
      serverUrl: ICLOUD_CALDAV_URL,
      rootUrl: ICLOUD_CALDAV_URL,
    },
    fetch: request,
  });
  return session(account, request);
};
