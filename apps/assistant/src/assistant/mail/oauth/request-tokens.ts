import { z } from "zod";
import { OAUTH_CONFIG, type OAuthProvider } from "./oauth-providers.ts";
import { OAuthTokenError } from "./oauth-token-error.ts";
import type { Fetch, OAuthTokens } from "./types.ts";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.coerce.number().positive(),
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().optional(),
});

const errorResponseSchema = z.object({ error: z.string() });

export async function requestTokens(
  provider: OAuthProvider,
  body: Record<string, string>,
  { fetch, now }: { fetch: Fetch; now: Date },
): Promise<OAuthTokens> {
  const response = await fetch(OAUTH_CONFIG[provider].tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(data);
    throw new OAuthTokenError(
      parsed.success ? parsed.data.error : `http_${String(response.status)}`,
    );
  }
  const parsed = tokenResponseSchema.safeParse(data);
  if (!parsed.success) throw new OAuthTokenError("invalid_response");
  return {
    accessToken: parsed.data.access_token,
    accessTokenExpiresAt: now.getTime() + parsed.data.expires_in * 1000,
    refreshToken: parsed.data.refresh_token ?? null,
    idToken: parsed.data.id_token ?? null,
  };
}
