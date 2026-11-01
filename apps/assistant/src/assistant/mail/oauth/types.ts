export type Fetch = typeof fetch;

export interface OAuthTokens {
  accessToken: string;
  /** Epoch milliseconds. */
  accessTokenExpiresAt: number;
  /** Microsoft sends a new one on every refresh; Google only on the first exchange. */
  refreshToken: string | null;
  idToken: string | null;
}
