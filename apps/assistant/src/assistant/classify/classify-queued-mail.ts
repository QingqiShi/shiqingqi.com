import { and, asc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import {
  DEFAULT_TIME_ZONE,
  mailCategories,
  mailClassifications,
  mailMessages,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import {
  classifyMail,
  type Classification,
  type ClassifyContext,
} from "./classify-mail.ts";
import { senderRules } from "./sender-rules.ts";

/** After this many failed model calls a mail stays `unsure`. */
export const MAX_CLASSIFY_ATTEMPTS = 4;
const PAGE_SIZE = 20;
const PARALLEL_CALLS = 4;
const ANSWERED = "\\Answered";

export interface ClassifierDeps {
  /** Null when no API key is set: then only the header rules run. */
  model: AssistantModel | null;
  now: () => Date;
}

export interface ClassifyQueueResult {
  classified: number;
  failed: number;
  /** Mail left for a later run, because it needs the model and there is none. */
  waiting: number;
}

const queuedMail = {
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

type QueuedMail = Awaited<ReturnType<typeof readQueuePage>>[number];

/**
 * `live` mail that has no classification, or whose model calls failed fewer
 * than the limit, oldest first, after `after`.
 */
function readQueuePage(
  { db }: UserScope,
  after: { receivedAt: Date; id: string } | null,
) {
  return db
    .select(queuedMail)
    .from(mailMessages)
    .leftJoin(
      mailClassifications,
      eq(mailClassifications.messageId, mailMessages.id),
    )
    .where(
      and(
        eq(mailMessages.origin, "live"),
        or(
          isNull(mailClassifications.id),
          and(
            eq(mailClassifications.decidedBy, "failed"),
            lt(mailClassifications.attempts, MAX_CLASSIFY_ATTEMPTS),
          ),
        ),
        after
          ? or(
              gt(mailMessages.receivedAt, after.receivedAt),
              and(
                eq(mailMessages.receivedAt, after.receivedAt),
                gt(mailMessages.id, after.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(mailMessages.receivedAt), asc(mailMessages.id))
    .limit(PAGE_SIZE);
}

/** What classification needs of the user, but whether the sender is known. */
export async function readClassifyContext(
  scope: UserScope,
): Promise<Omit<ClassifyContext, "knownCorrespondent">> {
  const settings = (
    await scope.db
      .select({ locale: userSettings.locale, timeZone: userSettings.timeZone })
      .from(userSettings)
  ).at(0);
  const categories = await scope.db
    .select({ id: mailCategories.id, name: mailCategories.name })
    .from(mailCategories)
    .orderBy(asc(mailCategories.name));
  return {
    categories,
    senderRules: await senderRules.listConfirmed(scope),
    locale: settings?.locale ?? "en",
    timeZone: settings?.timeZone ?? DEFAULT_TIME_ZONE,
  };
}

/**
 * True when the user has answered mail from `address`: some stored mail
 * from it has the `\Answered` flag.
 */
export async function isKnownCorrespondent(
  { db }: UserScope,
  address: string | null,
): Promise<boolean> {
  if (!address) return false;
  const rows = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(
      and(
        eq(mailMessages.fromAddress, address),
        sql`${ANSWERED} = any(${mailMessages.flags})`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function saveClassification(
  { db, userId }: UserScope,
  messageId: string,
  classification: Classification,
  now: Date,
) {
  const values = { ...classification, classifiedAt: now };
  await db
    .insert(mailClassifications)
    .values({ userId, messageId, ...values })
    .onConflictDoUpdate({
      target: mailClassifications.messageId,
      set: { ...values, attempts: sql`${mailClassifications.attempts} + 1` },
    });
}

async function saveFailure(
  { db, userId }: UserScope,
  messageId: string,
  model: AssistantModel,
  now: Date,
) {
  const values = {
    bucket: "unsure" as const,
    decidedBy: "failed" as const,
    reason: "model-failed",
    modelId: model.id,
    classifiedAt: now,
  };
  await db
    .insert(mailClassifications)
    .values({ userId, messageId, ...values })
    .onConflictDoUpdate({
      target: mailClassifications.messageId,
      set: { ...values, attempts: sql`${mailClassifications.attempts} + 1` },
    });
}

async function classifyOne(
  db: AssistantDb,
  userId: string,
  mail: QueuedMail,
  context: Omit<ClassifyContext, "knownCorrespondent">,
  deps: ClassifierDeps,
): Promise<"classified" | "failed" | "waiting"> {
  const knownCorrespondent = await withUser(db, userId, (scope) =>
    isKnownCorrespondent(scope, mail.fromAddress),
  );
  let classification: Classification | null;
  try {
    classification = await classifyMail(
      mail,
      { ...context, knownCorrespondent },
      deps.model,
    );
  } catch (error) {
    console.error(
      "Classification failed",
      mail.id,
      error instanceof Error ? error.message : error,
    );
    if (!deps.model) throw error;
    const { model } = deps;
    await withUser(db, userId, (scope) =>
      saveFailure(scope, mail.id, model, deps.now()),
    );
    return "failed";
  }
  if (!classification) return "waiting";
  const result = classification;
  await withUser(db, userId, (scope) =>
    saveClassification(scope, mail.id, result, deps.now()),
  );
  return "classified";
}

/**
 * Classifies the user's queued `live` mail, oldest first, until the queue
 * is empty or `endsAt`. A crash loses nothing: mail without a
 * classification stays in the queue.
 */
export async function classifyQueuedMail(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: ClassifierDeps,
): Promise<ClassifyQueueResult> {
  const result: ClassifyQueueResult = { classified: 0, failed: 0, waiting: 0 };
  const context = await withUser(db, userId, readClassifyContext);
  let after: { receivedAt: Date; id: string } | null = null;
  for (;;) {
    if (deps.now().getTime() >= endsAt) return result;
    const cursor = after;
    const page: QueuedMail[] = await withUser(db, userId, (scope) =>
      readQueuePage(scope, cursor),
    );
    if (page.length === 0) return result;
    for (let start = 0; start < page.length; start += PARALLEL_CALLS) {
      if (deps.now().getTime() >= endsAt) return result;
      const outcomes = await Promise.all(
        page
          .slice(start, start + PARALLEL_CALLS)
          .map((mail) => classifyOne(db, userId, mail, context, deps)),
      );
      for (const outcome of outcomes) result[outcome] += 1;
    }
    after = page[page.length - 1];
  }
}
