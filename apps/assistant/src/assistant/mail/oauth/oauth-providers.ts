export const OAUTH_PROVIDERS = ["gmail", "outlook"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export interface OAuthProviderConfig {
  /** The path segment of the connect routes, `/api/connect/<slug>/…`. */
  slug: "google" | "microsoft";
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** Extra parameters of the authorize request. */
  authorizeParams: Record<string, string>;
  clientIdEnv: string;
  clientSecretEnv: string;
}

export const OAUTH_CONFIG: Record<OAuthProvider, OAuthProviderConfig> = {
  gmail: {
    slug: "google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://mail.google.com/ openid email",
    // Google sends a refresh token only with offline access, and again only on consent.
    authorizeParams: { access_type: "offline", prompt: "consent" },
    clientIdEnv: "ASSISTANT_GOOGLE_CLIENT_ID",
    clientSecretEnv: "ASSISTANT_GOOGLE_CLIENT_SECRET",
  },
  outlook: {
    slug: "microsoft",
    authorizeUrl:
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope:
      "https://outlook.office.com/IMAP.AccessAsUser.All offline_access openid email",
    authorizeParams: { prompt: "select_account" },
    clientIdEnv: "ASSISTANT_MICROSOFT_CLIENT_ID",
    clientSecretEnv: "ASSISTANT_MICROSOFT_CLIENT_SECRET",
  },
};

export function oauthProviderOfSlug(slug: string): OAuthProvider | null {
  return (
    OAUTH_PROVIDERS.find((provider) => OAUTH_CONFIG[provider].slug === slug) ??
    null
  );
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
}

export function readOAuthClient(
  provider: OAuthProvider,
  env: Partial<Record<string, string>> = process.env,
): OAuthClient | null {
  const config = OAUTH_CONFIG[provider];
  const clientId = env[config.clientIdEnv];
  const clientSecret = env[config.clientSecretEnv];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function connectCallbackPath(provider: OAuthProvider) {
  return `/api/connect/${OAUTH_CONFIG[provider].slug}/callback`;
}
