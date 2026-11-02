import {
  createAccount,
  createObject,
  deleteObject,
  fetchCalendarObjects,
  fetchCalendars,
  propfind,
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

function hrefOf(value: unknown) {
  if (typeof value !== "object" || value === null || !("href" in value)) {
    return null;
  }
  return typeof value.href === "string" ? value.href : null;
}

/** The RFC 6638 default calendar, found from the principal's scheduling inbox. */
async function defaultCalendarUrl(account: DAVAccount, request: typeof fetch) {
  if (!account.principalUrl) return null;
  const root = account.rootUrl ?? ICLOUD_CALDAV_URL;
  // A server need not tell the default calendar. When it does not, or the
  // request fails, no calendar is the default and the agent chooses by name.
  try {
    const principal = await propfind({
      url: account.principalUrl,
      props: { "c:schedule-inbox-URL": {} },
      depth: "0",
      fetch: request,
    });
    const inbox = hrefOf(principal.at(0)?.props?.scheduleInboxURL);
    if (!inbox) return null;
    const answer = await propfind({
      url: new URL(inbox, root).href,
      props: { "c:schedule-default-calendar-URL": {} },
      depth: "0",
      fetch: request,
    });
    const href = hrefOf(answer.at(0)?.props?.scheduleDefaultCalendarURL);
    return href ? collectionUrl(new URL(href, root).href) : null;
  } catch {
    return null;
  }
}

function collectionUrl(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

/** CalendarServer marks a calendar that its owner shares, and one shared with the user. */
const SHARED_RESOURCE_TYPES = new Set(["shared", "sharedOwner"]);

function isShared(resourceTypes: unknown) {
  return (
    Array.isArray(resourceTypes) &&
    resourceTypes.some((type) => SHARED_RESOURCE_TYPES.has(String(type)))
  );
}

function session(account: DAVAccount, request: typeof fetch): CalendarSession {
  return {
    async listCalendars() {
      const [calendars, defaultUrl] = await Promise.all([
        fetchCalendars({ account, fetch: request }),
        defaultCalendarUrl(account, request),
      ]);
      return calendars
        .filter(
          (calendar) =>
            !calendar.components || calendar.components.includes("VEVENT"),
        )
        .map((calendar) => ({
          url: calendar.url,
          displayName: displayNameOf(calendar.displayName),
          isDefault: collectionUrl(calendar.url) === defaultUrl,
          shared: isShared(calendar.resourcetype),
        }));
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
      const response = checked(
        "PUT",
        await createObject({
          url,
          data,
          headers: { "content-type": ICS_TYPE, "If-None-Match": "*" },
          fetch: request,
        }),
      );
      return { url, etag: response.headers.get("ETag") };
    },

    async updateEvent(url, data, etag) {
      const response = checked(
        "PUT",
        await updateObject({
          url,
          data,
          etag: etag ?? undefined,
          headers: { "content-type": ICS_TYPE },
          fetch: request,
        }),
      );
      return { etag: response.headers.get("ETag") };
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
