/** An iCloud login: the address and the app-specific password of the mail account. */
export interface CalendarAuth {
  user: string;
  pass: string;
}

export interface CalendarInfo {
  url: string;
  displayName: string;
}

/** One iCalendar resource on the server. */
export interface CalendarObject {
  url: string;
  etag: string | null;
  data: string;
}

/**
 * A logged-in CalDAV account. The app writes only to resources inside its
 * own calendar; the other calendars are read for the duplicate check.
 */
export interface CalendarSession {
  /** The calendars that can hold events. */
  listCalendars(): Promise<CalendarInfo[]>;
  createCalendar(displayName: string): Promise<CalendarInfo>;
  /** The events of a calendar that overlap [start, end). */
  listEvents(
    calendarUrl: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarObject[]>;
  /** Null when the resource does not exist. */
  getEvent(url: string): Promise<CalendarObject | null>;
  /** Fails when the resource exists already. */
  createEvent(
    calendarUrl: string,
    filename: string,
    data: string,
  ): Promise<{ url: string }>;
  /** Fails when the resource changed since `etag`. */
  updateEvent(url: string, data: string, etag: string | null): Promise<void>;
  deleteEvent(url: string, etag: string | null): Promise<void>;
}

export type CalendarConnector = (
  auth: CalendarAuth,
) => Promise<CalendarSession>;
