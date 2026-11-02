import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import type { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
import { ownAccount } from "./own-account.ts";

/** What `mail_accounts.write_error_code` can hold. */
export type WriteErrorCode = "move_unsupported";

/** Records why the agent cannot change an account's mail, or clears it with null. */
export async function recordWriteState(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: MoveUnsupportedError | null,
  now: Date,
) {
  await db
    .update(mailAccounts)
    .set(
      error
        ? {
            writeErrorCode: "move_unsupported" satisfies WriteErrorCode,
            writeErrorMessage: error.message,
            writeErrorAt: now,
          }
        : {
            writeErrorCode: null,
            writeErrorMessage: null,
            writeErrorAt: null,
          },
    )
    .where(ownAccount(userId, accountId));
}
