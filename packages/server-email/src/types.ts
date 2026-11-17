/** An email with an HTML body and a plain-text alternative. */
export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends an email. Throws when the message was not accepted. */
export interface EmailSender {
  send: (email: Email) => Promise<void>;
}
