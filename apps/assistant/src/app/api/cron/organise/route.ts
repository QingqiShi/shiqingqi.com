import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getOrganiseDeps } from "#src/assistant/organise/get-organise-deps.ts";
import { makeOrganiseCron } from "#src/assistant/organise/make-organise-cron.ts";

export const maxDuration = 300;

export const GET = makeOrganiseCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getOrganiseDeps,
});
