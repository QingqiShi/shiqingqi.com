/** An email with an HTML body and a plain-text alternative. */
export interface FinanceEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends a Finance email. Throws when the message was not accepted. */
export interface FinanceEmailSender {
  send: (email: FinanceEmail) => Promise<void>;
}
