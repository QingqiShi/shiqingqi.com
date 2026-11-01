import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import { senderRules } from "#src/assistant/classify/sender-rules.ts";
import {
  mailCategories,
  mailClassifications,
  mailCorrections,
  mailMessages,
  type CorrectionKind,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import { draftSenderRule, type DraftedRule } from "./draft-sender-rule.ts";

/** Why the user closed digest items. */
export type CloseReason = "done" | "not_important";

/**
 * Runs after the response, once the user has closed digest items: the
 * mailbox writes clear the flag and move the mail (`writeMailboxes`).
 */
export type ItemsClosedHandler = (input: {
  db: AssistantDb;
  userId: string;
  /** `mail_messages.id` of each closed item. */
  messageIds: string[];
  reason: CloseReason;
}) => Promise<void>;

/**
 * Sets `done_at` on the items that are still open. Returns the mail of the
 * items it closed; an id of another user or of a closed item is skipped.
 */
export async function closeItems(
  { db }: UserScope,
  classificationIds: readonly string[],
  now: Date,
): Promise<string[]> {
  const closed = await db
    .update(mailClassifications)
    .set({ doneAt: now })
    .where(
      and(
        inArray(mailClassifications.id, [...classificationIds]),
        isNull(mailClassifications.doneAt),
      ),
    )
    .returning({ messageId: mailClassifications.messageId });
  return closed.map((row) => row.messageId);
}

/** The mail of the items, newest first. */
function readCorrectedMail(
  { db }: UserScope,
  classificationIds: readonly string[],
) {
  return db
    .select({
      messageId: mailMessages.id,
      fromAddress: mailMessages.fromAddress,
      fromName: mailMessages.fromName,
      subject: mailMessages.subject,
      summary: mailClassifications.summary,
      categoryId: mailClassifications.categoryId,
    })
    .from(mailClassifications)
    .innerJoin(mailMessages, eq(mailMessages.id, mailClassifications.messageId))
    .where(inArray(mailClassifications.id, [...classificationIds]))
    .orderBy(desc(mailMessages.receivedAt));
}

export interface CorrectionResult {
  /** The mail of the items, for the hook. Empty for a correction on unknown ids. */
  messageIds: string[];
  /** The mail the correction closed: "not important" closes, "should show" does not. */
  closedMessageIds: string[];
  /** The drafted rule, or null when the mail has no sender address. */
  rule: (DraftedRule & { id: string }) | null;
}

/**
 * Records that the classifier was wrong about the items of one thread, and
 * drafts a sender rule from the newest mail of the thread. "Not important"
 * also closes the items.
 */
export async function correctItems(
  { db, userId }: { db: AssistantDb; userId: string },
  {
    classificationIds,
    kind,
    now,
  }: { classificationIds: readonly string[]; kind: CorrectionKind; now: Date },
  model: AssistantModel | null,
): Promise<CorrectionResult> {
  const { mails, categories, closedMessageIds } = await withUser(
    db,
    userId,
    async (scope) => {
      const mails = await readCorrectedMail(scope, classificationIds);
      if (mails.length === 0) {
        return { mails, categories: [], closedMessageIds: [] };
      }
      await scope.db
        .insert(mailCorrections)
        .values(
          mails.map((mail) => ({ userId, messageId: mail.messageId, kind })),
        )
        .onConflictDoNothing();
      return {
        mails,
        categories: await scope.db
          .select({ id: mailCategories.id, name: mailCategories.name })
          .from(mailCategories)
          .orderBy(asc(mailCategories.name)),
        closedMessageIds:
          kind === "not_important"
            ? await closeItems(scope, classificationIds, now)
            : [],
      };
    },
  );
  const messageIds = mails.map((mail) => mail.messageId);
  const newest = mails.at(0);
  if (!newest?.fromAddress) return { messageIds, closedMessageIds, rule: null };
  const drafted = await draftSenderRule(
    {
      mail: { ...newest, fromAddress: newest.fromAddress },
      kind,
      categories,
    },
    model,
  );
  const ruleId = await withUser(db, userId, async (scope) => {
    const id = await senderRules.saveDraft(scope, {
      ...drafted,
      sourceMessageId: newest.messageId,
    });
    await scope.db
      .update(mailCorrections)
      .set({ senderRuleId: id })
      .where(
        and(
          inArray(mailCorrections.messageId, messageIds),
          eq(mailCorrections.kind, kind),
        ),
      );
    return id;
  });
  return { messageIds, closedMessageIds, rule: { ...drafted, id: ruleId } };
}
