import type { MailProvider } from "#src/assistant/db/schema.ts";

export const PROVIDER_NAMES: Record<MailProvider, string> = {
  icloud: "iCloud",
  gmail: "Gmail",
  outlook: "Outlook",
};
