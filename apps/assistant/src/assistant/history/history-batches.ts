import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import {
  classificationOf,
  type ClassifyContext,
} from "#src/assistant/classify/classify-mail.ts";
import { classifyPrompt } from "#src/assistant/classify/classify-prompt.ts";
import {
  isKnownCorrespondent,
  readClassifyContext,
} from "#src/assistant/classify/classify-queued-mail.ts";
import {
  mailClassifications,
  mailHistoryBatches,
  mailHistoryJobs,
  mailMessages,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import { readBatchOutput } from "./read-batch-output.ts";
import type {
  BatchItem,
  BatchRequest,
  MessageBatchApi,
  TokenUsage,
} from "./types.ts";

/** The batch model; the same as the per-mail calls, at half the price. */
export const HISTORY_MODEL_ID = "claude-haiku-5-5";
/** After this many failed answers a mail stays unclassified, until the user starts the import again. */
export const MAX_HISTORY_FAILURES = 3;
/** Small enough that the requests of one batch fit in the memory of one function. */
export const BATCH_REQUEST_LIMIT = 1000;
const BATCHES_PER_RUN = 3;
/** A batch row without an Anthropic id this old belongs to a run that stopped before the API took it. */
const UNSENT_BATCH_TIMEOUT_MS = 10 * 60 * 1000;
const RESULT_CHUNK = 50;
/** As in `askClassifier`. */
const MAX_OUTPUT_TOKENS = 2000;

export interface HistoryBatchDeps {
  batchApi: MessageBatchApi;
  now: () => Date;
}

const mailForModel = {
  id: mailMessages.id,
  receivedAt: mailMessages.receivedAt,
  fromAddress: mailMessages.fromAddress,
  fromName: mailMessages.fromName,
  toAddresses: mailMessages.toAddresses,
  ccAddresses: mailMessages.ccAddresses,
  subject: mailMessages.subject,
  sentAt: mailMessages.sentAt,
  listId: mailMessages.listId,
  listUnsubscribe: mailMessages.listUnsubscribe,
  autoSubmitted: mailMessages.autoSubmitted,
  precedence: mailMessages.precedence,
  snippet: mailMessages.snippet,
};

type MailForModel = Awaited<ReturnType<typeof readQueue>>[number];

/** Queued mail, newest first. */
function readQueue({ db }: UserScope, limit: number) {
  return db
    .select(mailForModel)
    .from(mailHistoryJobs)
    .innerJoin(mailMessages, eq(mailMessages.id, mailHistoryJobs.messageId))
    .where(
      and(
        isNull(mailHistoryJobs.batchId),
        lt(mailHistoryJobs.failures, MAX_HISTORY_FAILURES),
      ),
    )
    .orderBy(desc(mailMessages.receivedAt))
    .limit(limit);
}

/**
 * The request for one mail: the instructions and the mail exactly as the
 * per-mail call sends them, with a cache mark on the instructions, which
 * every request of the user shares.
 */
function requestOf(
  mail: MailForModel,
  context: Pick<ClassifyContext, "locale" | "timeZone">,
  categoryNames: readonly string[],
): BatchRequest {
  const { schema } = zodOutputFormat(
    classifyPrompt.outputSchema(categoryNames),
  );
  return {
    custom_id: mail.id,
    params: {
      model: HISTORY_MODEL_ID,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema },
      },
      system: [
        {
          type: "text",
          text: classifyPrompt.instructions(context.locale),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: classifyPrompt.describeMail(mail, {
            categoryNames,
            timeZone: context.timeZone,
          }),
        },
      ],
    },
  };
}

/**
 * Sends the queued mail to the Message Batches API. The batch row and the
 * claim on its mail commit before the API call, so a run that stops after
 * it never sends the same mail twice; a run that stops before the API took
 * the batch leaves a row that `pollHistoryBatches` gives back to the queue.
 */
async function submitHistoryBatches(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: HistoryBatchDeps,
): Promise<{ batches: number; requests: number }> {
  const result = { batches: 0, requests: 0 };
  const context = await withUser(db, userId, readClassifyContext);
  const categoryNames = context.categories.map((category) => category.name);
  for (let count = 0; count < BATCHES_PER_RUN; count += 1) {
    if (deps.now().getTime() >= endsAt) break;
    const claimed = await withUser(db, userId, async (scope) => {
      const mails = await readQueue(scope, BATCH_REQUEST_LIMIT);
      if (mails.length === 0) return null;
      const [batch] = await scope.db
        .insert(mailHistoryBatches)
        .values({
          userId,
          modelId: HISTORY_MODEL_ID,
          promptVersion: classifyPrompt.version,
          categoryNames,
          requestCount: mails.length,
        })
        .returning({ id: mailHistoryBatches.id });
      await scope.db
        .update(mailHistoryJobs)
        .set({ batchId: batch.id, updatedAt: deps.now() })
        .where(
          inArray(
            mailHistoryJobs.messageId,
            mails.map((mail) => mail.id),
          ),
        );
      return { batchId: batch.id, mails };
    });
    if (!claimed) break;
    try {
      const sent = await deps.batchApi.create(
        claimed.mails.map((mail) => requestOf(mail, context, categoryNames)),
      );
      await withUser(db, userId, ({ db }) =>
        db
          .update(mailHistoryBatches)
          .set({ anthropicBatchId: sent.id, submittedAt: deps.now() })
          .where(eq(mailHistoryBatches.id, claimed.batchId)),
      );
    } catch (error) {
      console.error(
        "History batch was not sent",
        error instanceof Error ? error.message : error,
      );
      await withUser(db, userId, (scope) =>
        releaseBatch(scope, claimed.batchId, deps.now()),
      );
      break;
    }
    result.batches += 1;
    result.requests += claimed.mails.length;
  }
  return result;
}

/** Gives the mail of a batch that never reached the API back to the queue. */
async function releaseBatch({ db }: UserScope, batchId: string, now: Date) {
  await db
    .update(mailHistoryJobs)
    .set({ batchId: null, updatedAt: now })
    .where(eq(mailHistoryJobs.batchId, batchId));
  await db.delete(mailHistoryBatches).where(eq(mailHistoryBatches.id, batchId));
}

interface OpenBatch {
  id: string;
  anthropicBatchId: string;
  modelId: string;
  promptVersion: number;
  categoryNames: string[];
}

function addUsage(total: TokenUsage, item: BatchItem) {
  if (item.outcome.type !== "succeeded") return;
  const { usage } = item.outcome;
  total.input += usage.input;
  total.output += usage.output;
  total.cacheRead += usage.cacheRead;
  total.cacheWrite += usage.cacheWrite;
}

/**
 * Stores a chunk of results in one transaction. Only results whose mail
 * still belongs to the batch count, so a run that reads the results again
 * after a stop stores nothing twice. A good answer becomes a classification
 * through the truth table, and the text that the model read is deleted; any
 * other answer puts the mail back in the queue.
 */
async function storeResults(
  scope: UserScope,
  batch: OpenBatch,
  items: readonly BatchItem[],
  context: Omit<ClassifyContext, "knownCorrespondent">,
  now: Date,
) {
  const { db, userId } = scope;
  const ids = items.map((item) => item.customId);
  const mails = await db
    .select(mailForModel)
    .from(mailHistoryJobs)
    .innerJoin(mailMessages, eq(mailMessages.id, mailHistoryJobs.messageId))
    .where(
      and(
        eq(mailHistoryJobs.batchId, batch.id),
        inArray(mailHistoryJobs.messageId, ids),
      ),
    );
  const byId = new Map(mails.map((mail) => [mail.id, mail]));
  const usage: TokenUsage = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };
  let classified = 0;
  let failed = 0;
  for (const item of items) {
    const mail = byId.get(item.customId);
    if (!mail) continue;
    addUsage(usage, item);
    const read = readBatchOutput(item.outcome, batch.categoryNames);
    if (!read.ok) {
      failed += 1;
      await db
        .update(mailHistoryJobs)
        .set({
          batchId: null,
          failures: sql`${mailHistoryJobs.failures} + 1`,
          lastError: read.reason,
          updatedAt: now,
        })
        .where(eq(mailHistoryJobs.messageId, mail.id));
      continue;
    }
    const knownCorrespondent = await isKnownCorrespondent(
      scope,
      mail.fromAddress,
    );
    const classification = classificationOf(
      mail,
      read.output,
      { ...context, knownCorrespondent },
      { id: batch.modelId, promptVersion: batch.promptVersion },
    );
    await db
      .insert(mailClassifications)
      .values({
        ...classification,
        userId,
        messageId: mail.id,
        classifiedAt: now,
      })
      .onConflictDoNothing({ target: mailClassifications.messageId });
    await db
      .update(mailMessages)
      .set({ snippet: "" })
      .where(eq(mailMessages.id, mail.id));
    await db
      .delete(mailHistoryJobs)
      .where(eq(mailHistoryJobs.messageId, mail.id));
    classified += 1;
  }
  await db
    .update(mailHistoryBatches)
    .set({
      inputTokens: sql`${mailHistoryBatches.inputTokens} + ${usage.input}`,
      outputTokens: sql`${mailHistoryBatches.outputTokens} + ${usage.output}`,
      cacheReadTokens: sql`${mailHistoryBatches.cacheReadTokens} + ${usage.cacheRead}`,
      cacheWriteTokens: sql`${mailHistoryBatches.cacheWriteTokens} + ${usage.cacheWrite}`,
    })
    .where(eq(mailHistoryBatches.id, batch.id));
  return { classified, failed };
}

/**
 * Stores the results of every batch that ended, until `endsAt`. A batch
 * stays open until all of its results are stored, so the next run reads
 * the rest. A request without a result counts as a failure.
 */
async function pollHistoryBatches(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: HistoryBatchDeps,
): Promise<{ classified: number; failed: number }> {
  const result = { classified: 0, failed: 0 };
  const now = deps.now();
  const open = await withUser(db, userId, async (scope) => {
    const unsent = await scope.db
      .select({ id: mailHistoryBatches.id })
      .from(mailHistoryBatches)
      .where(
        and(
          isNull(mailHistoryBatches.anthropicBatchId),
          lt(
            mailHistoryBatches.createdAt,
            new Date(now.getTime() - UNSENT_BATCH_TIMEOUT_MS),
          ),
        ),
      );
    for (const batch of unsent) await releaseBatch(scope, batch.id, now);
    return scope.db
      .select({
        id: mailHistoryBatches.id,
        anthropicBatchId: mailHistoryBatches.anthropicBatchId,
        modelId: mailHistoryBatches.modelId,
        promptVersion: mailHistoryBatches.promptVersion,
        categoryNames: mailHistoryBatches.categoryNames,
      })
      .from(mailHistoryBatches)
      .where(
        and(
          isNull(mailHistoryBatches.storedAt),
          isNotNull(mailHistoryBatches.anthropicBatchId),
        ),
      )
      .orderBy(mailHistoryBatches.createdAt);
  });
  if (open.length === 0) return result;
  const context = await withUser(db, userId, readClassifyContext);
  for (const row of open) {
    if (!row.anthropicBatchId) continue;
    const batch: OpenBatch = { ...row, anthropicBatchId: row.anthropicBatchId };
    if (deps.now().getTime() >= endsAt) break;
    if (!(await deps.batchApi.isEnded(batch.anthropicBatchId))) continue;
    let chunk: BatchItem[] = [];
    const flush = async () => {
      const items = chunk;
      chunk = [];
      const stored = await withUser(db, userId, (scope) =>
        storeResults(scope, batch, items, context, deps.now()),
      );
      result.classified += stored.classified;
      result.failed += stored.failed;
    };
    let finished = true;
    for await (const item of deps.batchApi.results(batch.anthropicBatchId)) {
      chunk.push(item);
      if (chunk.length < RESULT_CHUNK) continue;
      await flush();
      if (deps.now().getTime() >= endsAt) {
        finished = false;
        break;
      }
    }
    if (!finished) break;
    if (chunk.length > 0) await flush();
    const missing = await withUser(db, userId, async ({ db }) => {
      const left = await db
        .update(mailHistoryJobs)
        .set({
          batchId: null,
          failures: sql`${mailHistoryJobs.failures} + 1`,
          lastError: "no-result",
          updatedAt: deps.now(),
        })
        .where(eq(mailHistoryJobs.batchId, batch.id))
        .returning({ id: mailHistoryJobs.messageId });
      await db
        .update(mailHistoryBatches)
        .set({ storedAt: deps.now() })
        .where(eq(mailHistoryBatches.id, batch.id));
      return left.length;
    });
    result.failed += missing;
  }
  return result;
}

/** The two steps of the batch queue: the cron polls first, then submits. */
export const historyBatches = {
  submit: submitHistoryBatches,
  poll: pollHistoryBatches,
};
