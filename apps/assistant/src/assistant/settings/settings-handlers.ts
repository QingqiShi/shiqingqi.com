import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeSettingsHandlers } from "./make-settings-handlers.ts";

export const settingsHandlers = makeSettingsHandlers({
  isConfigured: isAssistantConfigured,
  userScope: getUserScope,
  getSession: getAssistantSession,
  now: () => new Date(),
});
