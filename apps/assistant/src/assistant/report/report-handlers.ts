import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";

export const reportHandlers = makeReportHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  now: () => new Date(),
});
