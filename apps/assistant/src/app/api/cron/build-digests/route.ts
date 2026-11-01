import { getEditorModel } from "#src/assistant/ai/get-editor-model.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { makeDigestCron } from "#src/assistant/digest/make-digest-cron.ts";
import { getPushSender } from "#src/assistant/push/get-push-sender.ts";

export const maxDuration = 300;

export const GET = makeDigestCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getBuildDeps: () => ({ model: getEditorModel(), now: () => new Date() }),
  getPushSender,
});
