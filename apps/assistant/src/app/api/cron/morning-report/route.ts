import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getPushSender } from "#src/assistant/push/get-push-sender.ts";
import { getReportBuildDeps } from "#src/assistant/report/get-report-build-deps.ts";
import { makeMorningReportCron } from "#src/assistant/report/make-morning-report-cron.ts";

export const maxDuration = 800;

export const GET = makeMorningReportCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getBuildDeps: getReportBuildDeps,
  getPushSender,
});
