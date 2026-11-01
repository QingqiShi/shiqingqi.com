import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { tsdavConnector } from "./caldav/tsdav-connector.ts";
import { makeCalendarHandlers } from "./make-calendar-handlers.ts";

export const calendarHandlers = makeCalendarHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  getCalendarDeps: () => {
    const deps = getMailDeps();
    return deps ? { connector: tsdavConnector, auth: deps.auth } : null;
  },
});
