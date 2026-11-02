import "server-only";
import type { CalendarDeps } from "#src/assistant/agent/calendar/run-calendars.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";

/** The calendar dependencies of the running app, or null when `ASSISTANT_CREDENTIAL_KEY` is missing. */
export function getCalendarDeps(): CalendarDeps | null {
  const mail = getMailDeps();
  return mail ? { calendarConnector: tsdavConnector, auth: mail.auth } : null;
}
