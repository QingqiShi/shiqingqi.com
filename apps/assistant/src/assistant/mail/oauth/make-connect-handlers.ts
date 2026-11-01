import { randomBytes } from "node:crypto";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import { getRequestOrigin } from "#src/assistant/auth/get-request-origin.ts";
import { needsSecureCookie } from "#src/assistant/auth/needs-secure-cookie.ts";
import { readRequestCookie } from "#src/assistant/auth/read-request-cookie.ts";
import { signInPath } from "#src/assistant/auth/sign-in-path.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { assistantJson, NO_STORE } from "#src/assistant/http/assistant-json.ts";
import { FIRST_SYNC_BUDGET_MS } from "#src/assistant/mail/constants.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import { buildAuthorizeUrl } from "#src/assistant/mail/oauth/build-authorize-url.ts";
import { createPkce } from "#src/assistant/mail/oauth/create-pkce.ts";
import { emailOfIdToken } from "#src/assistant/mail/oauth/email-of-id-token.ts";
import { exchangeCode } from "#src/assistant/mail/oauth/exchange-code.ts";
import { OAuthTokenError } from "#src/assistant/mail/oauth/oauth-token-error.ts";
import type { Fetch } from "#src/assistant/mail/oauth/types.ts";
import type { MailHandlerDeps } from "#src/assistant/mail/types.ts";
import { saveAccount } from "../accounts/save-account.ts";
import { syncUserMail } from "../sync/sync-user-mail.ts";
import { connectCookie } from "./connect-cookie.ts";
import {
  connectCallbackPath,
  oauthProviderOfSlug,
  type OAuthClient,
  type OAuthProvider,
} from "./oauth-providers.ts";

export interface ConnectHandlerDeps extends MailHandlerDeps {
  authSecret: () => string | undefined;
  oauthClient: (provider: OAuthProvider) => OAuthClient | null;
  fetch: Fetch;
}

/** Why a connect failed, as the accounts page reads it from `?error=`. */
export type ConnectErrorCode =
  | "not-configured"
  | "state"
  | "denied"
  | "token"
  | "no-refresh-token"
  | "no-email"
  | "imap-refused"
  | "mail-server-unreachable";

function redirect(location: string, cookie?: string) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": NO_STORE,
  });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function accountsUrl(
  origin: string,
  locale: SupportedLocale,
  query: Record<string, string>,
) {
  const url = new URL(getLocalePath("/accounts", locale), origin);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  return url.toString();
}

/**
 * The OAuth web flow for Gmail and Outlook: `start` sends the browser to the
 * provider with a state and a PKCE challenge kept in a sealed cookie;
 * `callback` checks both, exchanges the code, tries the IMAP login, and
 * stores the account.
 */
export function makeConnectHandlers(deps: ConnectHandlerDeps) {
  return {
    start: async (request: Request, slug: string): Promise<Response> => {
      const provider = oauthProviderOfSlug(slug);
      if (!provider)
        return assistantJson({ error: "not-found" }, { status: 404 });
      const url = new URL(request.url);
      const localeParam = url.searchParams.get("locale") ?? "en";
      const locale = isValidLocale(localeParam) ? localeParam : "en";
      const origin = getRequestOrigin(request);
      if (!deps.isConfigured()) {
        return assistantJson({ error: "not-configured" }, { status: 503 });
      }
      const session = await deps.getSession(request);
      if (!session) {
        return redirect(
          new URL(signInPath(locale, "/accounts"), origin).toString(),
        );
      }
      const client = deps.oauthClient(provider);
      const secret = deps.authSecret();
      if (!client || !secret || !deps.getMailDeps()) {
        return redirect(
          accountsUrl(origin, locale, { error: "not-configured" }),
        );
      }
      const state = randomBytes(24).toString("base64url");
      const pkce = createPkce();
      const sealed = connectCookie.seal(
        {
          provider,
          state,
          codeVerifier: pkce.verifier,
          userId: session.userId,
          locale,
        },
        secret,
        deps.now(),
      );
      return redirect(
        buildAuthorizeUrl(provider, {
          clientId: client.clientId,
          redirectUri: new URL(
            connectCallbackPath(provider),
            origin,
          ).toString(),
          state,
          codeChallenge: pkce.challenge,
        }),
        connectCookie.serialize(sealed, needsSecureCookie(origin)),
      );
    },

    callback: async (request: Request, slug: string): Promise<Response> => {
      const provider = oauthProviderOfSlug(slug);
      if (!provider)
        return assistantJson({ error: "not-found" }, { status: 404 });
      const origin = getRequestOrigin(request);
      const secure = needsSecureCookie(origin);
      const clear = connectCookie.clear(secure);
      const url = new URL(request.url);
      const secret = deps.authSecret();
      const cookie = readRequestCookie(request, connectCookie.name);
      const payload =
        cookie && secret
          ? connectCookie.open(cookie, secret, deps.now())
          : null;
      const locale = payload?.locale ?? "en";
      const fail = (error: ConnectErrorCode) =>
        redirect(accountsUrl(origin, locale, { error }), clear);

      const session = deps.isConfigured()
        ? await deps.getSession(request)
        : null;
      if (
        !payload ||
        !session ||
        payload.provider !== provider ||
        payload.userId !== session.userId ||
        url.searchParams.get("state") !== payload.state
      ) {
        return fail("state");
      }
      const code = url.searchParams.get("code");
      if (url.searchParams.has("error") || !code) return fail("denied");
      const client = deps.oauthClient(provider);
      const mail = deps.getMailDeps();
      if (!client || !mail) return fail("not-configured");

      let tokens;
      try {
        tokens = await exchangeCode(
          provider,
          {
            client,
            code,
            codeVerifier: payload.codeVerifier,
            redirectUri: new URL(
              connectCallbackPath(provider),
              origin,
            ).toString(),
          },
          { fetch: deps.fetch, now: deps.now() },
        );
      } catch (error) {
        if (error instanceof OAuthTokenError) return fail("token");
        throw error;
      }
      const { refreshToken } = tokens;
      if (!refreshToken) return fail("no-refresh-token");
      const address = emailOfIdToken(tokens.idToken);
      if (!address) return fail("no-email");

      try {
        const mailbox = await mail.connector(MAIL_SERVERS[provider], {
          user: address,
          accessToken: tokens.accessToken,
        });
        await mailbox.close().catch(() => undefined);
      } catch (error) {
        return fail(
          error instanceof MailboxAuthError
            ? "imap-refused"
            : "mail-server-unreachable",
        );
      }

      const db = deps.getDb();
      const { userId } = session;
      const { accountId } = await withUser(db, userId, (scope) =>
        saveAccount(scope, {
          provider,
          address,
          credential: {
            type: "oauth",
            refreshToken,
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          },
          credentialKey: mail.auth.credentialKey,
          now: deps.now(),
        }),
      );
      deps.runAfter(() =>
        syncUserMail(
          {
            db,
            userId,
            accountIds: [accountId],
            endsAt: deps.now().getTime() + FIRST_SYNC_BUDGET_MS,
            now: deps.now,
          },
          mail,
        ),
      );
      return redirect(
        accountsUrl(origin, locale, { connected: provider }),
        clear,
      );
    },
  };
}
