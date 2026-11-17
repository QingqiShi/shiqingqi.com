import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeReportHandlers } from "./make-report-handlers.ts";

export const reportHandlers = makeReportHandlers({
  isConfigured: isAssistantConfigured,
  userScope: getUserScope,
  getSession: getAssistantSession,
  now: () => new Date(),
});
