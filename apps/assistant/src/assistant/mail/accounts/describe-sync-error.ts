import type { MailAccountStatus } from "#src/assistant/db/schema.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import { OAuthTokenError } from "#src/assistant/mail/oauth/oauth-token-error.ts";
import {
  CredentialUnreadableError,
  OAuthNotConfiguredError,
} from "./resolve-mailbox-auth.ts";

export const SYNC_ERROR_CODES = [
  "login_refused",
  "token_revoked",
  "token_refresh_failed",
  "credential_unreadable",
  "not_configured",
  "sync_failed",
] as const;
export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

const MAX_MESSAGE_CHARS = 300;

/**
 * How an account shows a failed login or run. `reconnect` stops the crons from
 * trying again: the stored login cannot work until the user connects anew.
 * The message never holds a secret: no error here carries one.
 */
export function describeSyncError(error: unknown): {
  status: MailAccountStatus;
  code: SyncErrorCode;
  message: string;
} {
  const message = (error instanceof Error ? error.message : String(error))
    .replace(/\s+/g, " ")
    .slice(0, MAX_MESSAGE_CHARS);
  if (error instanceof MailboxAuthError) {
    return { status: "reconnect", code: "login_refused", message };
  }
  if (error instanceof CredentialUnreadableError) {
    return { status: "reconnect", code: "credential_unreadable", message };
  }
  if (error instanceof OAuthTokenError) {
    return error.needsReconnect
      ? { status: "reconnect", code: "token_revoked", message }
      : { status: "error", code: "token_refresh_failed", message };
  }
  if (error instanceof OAuthNotConfiguredError) {
    return { status: "error", code: "not_configured", message };
  }
  return { status: "error", code: "sync_failed", message };
}
