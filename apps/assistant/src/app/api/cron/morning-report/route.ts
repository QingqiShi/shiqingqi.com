import { getAgentModels } from "#src/assistant/ai/get-agent-models.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { getPushSender } from "#src/assistant/push/get-push-sender.ts";
import { makeMorningReportCron } from "#src/assistant/report/make-morning-report-cron.ts";

export const maxDuration = 300;

export const GET = makeMorningReportCron({
  isConfigured: isAssistantConfigured,
  getDb: getAssistantDb,
  now: () => new Date(),
  getBuildDeps: () => {
    const mail = getMailDeps();
    return mail
      ? {
          models: getAgentModels(),
          mail,
          calendarConnector: tsdavConnector,
          now: () => new Date(),
        }
      : null;
  },
  getPushSender,
});
