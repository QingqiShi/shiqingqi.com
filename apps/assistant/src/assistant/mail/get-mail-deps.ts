import "server-only";
import { getClassifierModel } from "#src/assistant/ai/get-classifier-model.ts";
import { tsdavConnector } from "#src/assistant/calendar/caldav/tsdav-connector.ts";
import { writeCalendarEvents } from "#src/assistant/calendar/write-calendar-events.ts";
import { classifyQueuedMail } from "#src/assistant/classify/classify-queued-mail.ts";
import { readCredentialKey } from "./accounts/credential-cipher.ts";
import { imapflowConnector } from "./imap/imapflow-connector.ts";
import { readOAuthClient } from "./oauth/oauth-providers.ts";
import type { SyncDeps } from "./sync/sync-account.ts";
import type { SyncUserMailDeps } from "./sync/sync-user-mail.ts";
import { writeMailboxes } from "./tidy/write-mailboxes.ts";

/** The mail dependencies of the running app, or null when `ASSISTANT_CREDENTIAL_KEY` is missing. */
export function getMailDeps(): SyncUserMailDeps | null {
  const credentialKey = readCredentialKey(process.env.ASSISTANT_CREDENTIAL_KEY);
  if (!credentialKey) return null;
  const deps: SyncDeps = {
    connector: imapflowConnector,
    auth: {
      credentialKey,
      oauthClient: (provider) => readOAuthClient(provider),
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    },
  };
  return {
    ...deps,
    onNewMail: async ({ db, userId, endsAt }) => {
      await classifyQueuedMail(
        { db, userId, endsAt },
        { model: getClassifierModel(), now: () => new Date() },
      );
      await writeCalendarEvents(
        { db, userId, endsAt },
        { connector: tsdavConnector, auth: deps.auth },
      );
      await writeMailboxes({ db, userId, endsAt }, deps);
    },
  };
}
