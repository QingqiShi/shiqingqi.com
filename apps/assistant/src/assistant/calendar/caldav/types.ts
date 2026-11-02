/** An iCloud login: the address and the app-specific password of the mail account. */
export interface CalendarAuth {
  user: string;
  pass: string;
}

export interface CalendarInfo {
  url: string;
  displayName: string;
  /** The account's default calendar for new events. */
  isDefault: boolean;
  /** Shared with other people, or by another person: they see its events. */
  shared: boolean;
}

/** One iCalendar resource on the server. */
export interface CalendarObject {
  url: string;
  etag: string | null;
  data: string;
}

/** A logged-in CalDAV account. */
export interface CalendarSession {
  /** The calendars that can hold events. */
  listCalendars(): Promise<CalendarInfo[]>;
  /** The events of a calendar that overlap [start, end). */
  listEvents(
    calendarUrl: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarObject[]>;
  /** Null when the resource does not exist. */
  getEvent(url: string): Promise<CalendarObject | null>;
  /** Fails when the resource exists already. `etag` is null when the server does not say it. */
  createEvent(
    calendarUrl: string,
    filename: string,
    data: string,
  ): Promise<{ url: string; etag: string | null }>;
  /** Fails with 412 when the resource changed since `etag`. */
  updateEvent(
    url: string,
    data: string,
    etag: string | null,
  ): Promise<{ etag: string | null }>;
  /** Fails with 412 when the resource changed since `etag`. */
  deleteEvent(url: string, etag: string | null): Promise<void>;
}

export type CalendarConnector = (
  auth: CalendarAuth,
) => Promise<CalendarSession>;
