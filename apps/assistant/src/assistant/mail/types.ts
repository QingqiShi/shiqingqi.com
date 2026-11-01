import type { AssistantSession } from "#src/assistant/auth/types.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import type { MailboxDeps } from "./accounts/open-mailbox-session.ts";

/** What the mail routes need from the running app. */
export interface MailHandlerDeps {
  isConfigured: () => boolean;
  getDb: () => AssistantDb;
  getSession: (request: Request) => Promise<AssistantSession | null>;
  /** Null when the credential key is missing. */
  getMailDeps: () => MailboxDeps | null;
  now: () => Date;
  /** Runs a task after the response is sent: `after` from next/server. */
  runAfter: (task: () => Promise<unknown>) => void;
}
