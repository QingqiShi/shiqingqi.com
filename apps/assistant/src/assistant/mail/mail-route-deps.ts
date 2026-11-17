import { after } from "next/server";
import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getUserScope } from "#src/assistant/db/get-user-scope.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "./get-mail-deps.ts";
import type { MailHandlerDeps } from "./types.ts";

/** The mail routes' dependencies in the running app. */
export const mailRouteDeps: MailHandlerDeps = {
  isConfigured: isAssistantConfigured,
  userScope: getUserScope,
  getSession: getAssistantSession,
  getMailDeps,
  now: () => new Date(),
  runAfter: (task) => {
    after(task);
  },
};
