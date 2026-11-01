import { mailAccounts, type MailProvider } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { accountCredential } from "#src/assistant/mail/accounts/account-credential.ts";
import type { MailboxAuth } from "#src/assistant/mail/imap/types.ts";
import { refreshTokens } from "#src/assistant/mail/oauth/refresh-tokens.ts";
import type { Fetch } from "#src/assistant/mail/oauth/types.ts";
import type { OAuthClient, OAuthProvider } from "../oauth/oauth-providers.ts";
import { ownAccount } from "./own-account.ts";

/** An access token this close to its expiry is refreshed first. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface MailboxAuthDeps {
  credentialKey: Uint8Array;
  oauthClient: (provider: OAuthProvider) => OAuthClient | null;
  fetch: Fetch;
  now: () => Date;
}

export interface StoredAccount {
  id: string;
  provider: MailProvider;
  address: string;
  credential: Uint8Array;
}

/** The stored login does not open: the key changed, or the row was changed. */
export class CredentialUnreadableError extends Error {
  constructor() {
    super("The stored login of this account cannot be opened");
    this.name = "CredentialUnreadableError";
  }
}

export class OAuthNotConfiguredError extends Error {
  constructor(provider: OAuthProvider) {
    super(`The OAuth client of ${provider} is not configured`);
    this.name = "OAuthNotConfiguredError";
  }
}

/**
 * The IMAP login of an account. An OAuth access token near its expiry, or
 * any OAuth access token with `forceRefresh`, is refreshed, and the new
 * tokens are stored before they are used: Microsoft makes the old refresh
 * token stop working.
 */
export async function resolveMailboxAuth(
  db: AssistantDb,
  userId: string,
  account: StoredAccount,
  deps: MailboxAuthDeps,
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
): Promise<MailboxAuth> {
  const owner = { userId, accountId: account.id };
  const credential = accountCredential.open(
    account.credential,
    deps.credentialKey,
    owner,
  );
  if (!credential) throw new CredentialUnreadableError();
  if (credential.type === "password") {
    return { user: account.address, pass: credential.password };
  }
  const now = deps.now();
  if (
    !forceRefresh &&
    credential.accessTokenExpiresAt - now.getTime() > REFRESH_MARGIN_MS
  ) {
    return { user: account.address, accessToken: credential.accessToken };
  }
  if (account.provider === "icloud") throw new CredentialUnreadableError();
  const client = deps.oauthClient(account.provider);
  if (!client) throw new OAuthNotConfiguredError(account.provider);
  const tokens = await refreshTokens(
    account.provider,
    { client, refreshToken: credential.refreshToken },
    { fetch: deps.fetch, now },
  );
  const sealed = accountCredential.seal(
    {
      type: "oauth",
      refreshToken: tokens.refreshToken ?? credential.refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    },
    deps.credentialKey,
    owner,
  );
  await db
    .update(mailAccounts)
    .set({ credential: sealed, updatedAt: now })
    .where(ownAccount(userId, account.id));
  return { user: account.address, accessToken: tokens.accessToken };
}
