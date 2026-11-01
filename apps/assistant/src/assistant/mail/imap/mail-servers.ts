import type { MailProvider } from "#src/assistant/db/schema.ts";
import type { MailServer } from "./types.ts";

export const MAIL_SERVERS: Record<MailProvider, MailServer> = {
  icloud: { host: "imap.mail.me.com", port: 993 },
  gmail: { host: "imap.gmail.com", port: 993 },
  outlook: { host: "outlook.office365.com", port: 993 },
};
