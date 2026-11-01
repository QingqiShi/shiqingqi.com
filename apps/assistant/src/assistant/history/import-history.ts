import { userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import type { SyncDeps } from "#src/assistant/mail/sync/sync-account.ts";
import { historyBatches } from "./history-batches.ts";
import type { MessageBatchApi } from "./types.ts";
import { walkHistory } from "./walk-history.ts";

/** The walk stops this long before the end, to leave time to send the batch, but it gets at least three quarters of the time left. */
const SUBMIT_RESERVE_MS = 30_000;

export interface HistoryImportDeps {
  mail: SyncDeps;
  /** Null when no API key is set: then mail that needs the model waits in the queue. */
  batchApi: MessageBatchApi | null;
  now: () => Date;
}

export interface HistoryImportResult {
  stored: number;
  queued: number;
  submitted: number;
  classified: number;
  failed: number;
}

/**
 * One run of history import for a user: it stores the answers of the
 * batches that ended, then, while the user has the import on, walks the
 * folders and sends the queued mail in new batches. History mail never
 * reaches a digest, a mailbox write or a calendar event: those read only
 * `live` mail.
 */
export async function importHistory(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: HistoryImportDeps,
): Promise<HistoryImportResult> {
  const result: HistoryImportResult = {
    stored: 0,
    queued: 0,
    submitted: 0,
    classified: 0,
    failed: 0,
  };
  if (deps.batchApi) {
    const polled = await historyBatches.poll(
      { db, userId, endsAt },
      { batchApi: deps.batchApi, now: deps.now },
    );
    result.classified += polled.classified;
    result.failed += polled.failed;
  }
  const settings = (
    await withUser(db, userId, ({ db }) =>
      db.select({ on: userSettings.historyImport }).from(userSettings),
    )
  ).at(0);
  if (!settings?.on) return result;
  const reserve = Math.min(
    SUBMIT_RESERVE_MS,
    (endsAt - deps.now().getTime()) / 4,
  );
  const walked = await walkHistory(
    { db, userId, endsAt: endsAt - reserve },
    deps.mail,
  );
  result.stored += walked.stored;
  result.queued += walked.queued;
  if (deps.batchApi) {
    const submitted = await historyBatches.submit(
      { db, userId, endsAt },
      { batchApi: deps.batchApi, now: deps.now },
    );
    result.submitted += submitted.requests;
  }
  return result;
}
