import "server-only";
import { readCredentialKey } from "./accounts/credential-cipher.ts";
import type { MailboxDeps } from "./accounts/open-mailbox-session.ts";
import { imapflowConnector } from "./imap/imapflow-connector.ts";
import { readOAuthClient } from "./oauth/oauth-providers.ts";

/** The mail dependencies of the running app, or null when `ASSISTANT_CREDENTIAL_KEY` is missing. */
export function getMailDeps(): MailboxDeps | null {
  const credentialKey = readCredentialKey(process.env.ASSISTANT_CREDENTIAL_KEY);
  if (!credentialKey) return null;
  return {
    connector: imapflowConnector,
    auth: {
      credentialKey,
      oauthClient: (provider) => readOAuthClient(provider),
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    },
  };
}
