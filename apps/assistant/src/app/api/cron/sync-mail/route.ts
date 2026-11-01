import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { makeMailSyncCron } from "#src/assistant/mail/sync/make-mail-sync-cron.ts";

export const maxDuration = 300;

export const GET = makeMailSyncCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getMailDeps,
});
