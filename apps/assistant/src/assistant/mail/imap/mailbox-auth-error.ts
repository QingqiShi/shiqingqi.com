/** The server refused the login: the password or token is wrong, revoked, or IMAP is off. */
export class MailboxAuthError extends Error {
  constructor(message = "The mail server refused the login") {
    super(message);
    this.name = "MailboxAuthError";
  }
}
