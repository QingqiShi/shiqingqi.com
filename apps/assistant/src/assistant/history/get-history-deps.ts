import "server-only";
import { getMailDeps } from "#src/assistant/mail/get-mail-deps.ts";
import { getAnthropicBatchApi } from "./get-anthropic-batch-api.ts";
import type { HistoryImportDeps } from "./import-history.ts";

/** The history import dependencies of the running app, or null when `ASSISTANT_CREDENTIAL_KEY` is missing. */
export function getHistoryDeps(): HistoryImportDeps | null {
  const mail = getMailDeps();
  if (!mail) return null;
  return {
    mail: { connector: mail.connector, auth: mail.auth },
    batchApi: getAnthropicBatchApi(),
    now: () => new Date(),
  };
}
