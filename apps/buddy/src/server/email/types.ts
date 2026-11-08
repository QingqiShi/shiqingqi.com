/** An email with an HTML body and a plain-text alternative. */
export interface BuddyEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends a Buddy email. Throws when the message was not accepted. */
export interface BuddyEmailSender {
  send: (email: BuddyEmail) => Promise<void>;
}
