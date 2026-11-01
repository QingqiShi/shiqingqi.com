import { OAUTH_CONFIG, type OAuthProvider } from "./oauth-providers.ts";

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  {
    clientId,
    redirectUri,
    state,
    codeChallenge,
  }: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
  },
): string {
  const config = OAUTH_CONFIG[provider];
  const url = new URL(config.authorizeUrl);
  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...config.authorizeParams,
  };
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return url.toString();
}
