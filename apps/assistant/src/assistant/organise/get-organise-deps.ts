import "server-only";
import { getAgentModels } from "#src/assistant/ai/get-agent-models.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import type { OrganiseDeps } from "./organise-user-mail.ts";

/** The organise dependencies of the running app, or null without the credential key or the Anthropic key. */
export function getOrganiseDeps(): OrganiseDeps | null {
  const mail = getMailDeps();
  const models = getAgentModels();
  return mail && models
    ? {
        ...mail,
        calendarConnector: tsdavConnector,
        agent: models.agent,
        reader: models.reader,
      }
    : null;
}
