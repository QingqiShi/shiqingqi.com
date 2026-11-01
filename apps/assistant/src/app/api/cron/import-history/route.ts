import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getHistoryDeps } from "#src/assistant/history/get-history-deps.ts";
import { makeHistoryCron } from "#src/assistant/history/make-history-cron.ts";

export const maxDuration = 300;

export const GET = makeHistoryCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getHistoryDeps,
});
