import { after } from "next/server";
import "server-only";
import { getEditorModel } from "#src/assistant/ai/get-editor-model.ts";
import { getAssistantSession } from "#src/assistant/auth/get-assistant-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import {
  CLOSED_ITEMS_WRITE_BUDGET_MS,
  writeMailboxes,
} from "#src/assistant/mail/tidy/write-mailboxes.ts";
import { makeDigestHandlers } from "./make-digest-handlers.ts";

export const digestHandlers = makeDigestHandlers({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  getSession: getAssistantSession,
  getEditorModel,
  onItemsClosed: async ({ db, userId, messageIds }) => {
    const deps = getMailDeps();
    if (!deps) return;
    await writeMailboxes(
      {
        db,
        userId,
        messageIds,
        endsAt: Date.now() + CLOSED_ITEMS_WRITE_BUDGET_MS,
      },
      deps,
    );
  },
  now: () => new Date(),
  runAfter: (task) => {
    after(task);
  },
});
