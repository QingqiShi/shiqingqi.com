import "server-only";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { isAllowedAssistantOrigin } from "./is-allowed-assistant-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";

export const authHandlers = makeAuthHandlers({
  getDb: () => (isAssistantConfigured() ? getAssistantDb() : null),
  now: () => new Date(),
  authSecret: () => process.env.ASSISTANT_AUTH_SECRET,
  isAllowedOrigin: isAllowedAssistantOrigin,
});
