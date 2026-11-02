import { setTimeout as sleep } from "node:timers/promises";
import "server-only";
import { getAgentModels } from "#src/assistant/ai/get-agent-models.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import type { ReportBuildDeps } from "./build-morning-report.ts";

/** What a report run needs in the running app, or null when no mailbox can be read. */
export function getReportBuildDeps(): ReportBuildDeps | null {
  const mail = getMailDeps();
  return mail
    ? {
        models: getAgentModels(),
        mail,
        calendarConnector: tsdavConnector,
        now: () => new Date(),
        sleep: (ms) => sleep(ms),
      }
    : null;
}
