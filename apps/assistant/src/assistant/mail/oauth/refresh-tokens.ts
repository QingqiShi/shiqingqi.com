import {
  OAUTH_CONFIG,
  type OAuthClient,
  type OAuthProvider,
} from "./oauth-providers.ts";
import { requestTokens } from "./request-tokens.ts";
import type { Fetch, OAuthTokens } from "./types.ts";

export function refreshTokens(
  provider: OAuthProvider,
  { client, refreshToken }: { client: OAuthClient; refreshToken: string },
  deps: { fetch: Fetch; now: Date },
): Promise<OAuthTokens> {
  return requestTokens(
    provider,
    {
      grant_type: "refresh_token",
      client_id: client.clientId,
      client_secret: client.clientSecret,
      refresh_token: refreshToken,
      ...(provider === "outlook" ? { scope: OAUTH_CONFIG.outlook.scope } : {}),
    },
    deps,
  );
}
