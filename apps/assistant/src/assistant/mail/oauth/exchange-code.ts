import type { OAuthClient, OAuthProvider } from "./oauth-providers.ts";
import { requestTokens } from "./request-tokens.ts";
import type { Fetch, OAuthTokens } from "./types.ts";

export function exchangeCode(
  provider: OAuthProvider,
  {
    client,
    code,
    codeVerifier,
    redirectUri,
  }: {
    client: OAuthClient;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  },
  deps: { fetch: Fetch; now: Date },
): Promise<OAuthTokens> {
  return requestTokens(
    provider,
    {
      grant_type: "authorization_code",
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    },
    deps,
  );
}
