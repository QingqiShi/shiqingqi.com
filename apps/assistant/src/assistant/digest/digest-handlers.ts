import { after } from "next/server";
import "server-only";
import { getEditorModel } from "#src/assistant/ai/get-editor-model.ts";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeDigestHandlers } from "./make-digest-handlers.ts";

export const digestHandlers = makeDigestHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  getEditorModel,
  onItemsClosed: () => Promise.resolve(),
  now: () => new Date(),
  runAfter: (task) => {
    after(task);
  },
});
