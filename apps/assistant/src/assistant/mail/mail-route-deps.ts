import { after } from "next/server";
import "server-only";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "./get-mail-deps.ts";
import type { MailHandlerDeps } from "./types.ts";

/** The mail routes' dependencies in the running app. */
export const mailRouteDeps: MailHandlerDeps = {
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  getMailDeps,
  now: () => new Date(),
  runAfter: (task) => {
    after(task);
  },
};
