import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeHistoryHandlers } from "./make-history-handlers.ts";

export const historyHandlers = makeHistoryHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  now: () => new Date(),
});
