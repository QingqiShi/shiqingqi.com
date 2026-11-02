import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { makeActivityHandlers } from "./make-activity-handlers.ts";

export const activityHandlers = makeActivityHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  getUndoDeps: () => {
    const mail = getMailDeps();
    return mail ? { ...mail, calendarConnector: tsdavConnector } : null;
  },
  now: () => new Date(),
});
