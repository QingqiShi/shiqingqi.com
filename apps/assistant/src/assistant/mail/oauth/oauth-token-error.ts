/** The provider refused the token request. `invalid_grant` means the user must connect again. */
export class OAuthTokenError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`The token request failed: ${code}`);
    this.name = "OAuthTokenError";
    this.code = code;
  }

  get needsReconnect() {
    return this.code === "invalid_grant";
  }
}
