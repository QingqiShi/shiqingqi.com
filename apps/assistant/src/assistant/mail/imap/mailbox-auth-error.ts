/** The server refused the login: the password or token is wrong, revoked, or IMAP is off. */
export class MailboxAuthError extends Error {
  readonly serverResponseCode: string | undefined;

  constructor(
    message = "The mail server refused the login",
    serverResponseCode?: string,
  ) {
    super(message);
    this.name = "MailboxAuthError";
    this.serverResponseCode = serverResponseCode;
  }
}

/**
 * The server refused a login with an OAuth access token that the provider
 * had just issued. The grant still works, so a new connect does not help:
 * Outlook refuses such sessions for a while with "User is authenticated but
 * not connected", and a later run gets in.
 */
export class MailboxSessionRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailboxSessionRefusedError";
  }
}
