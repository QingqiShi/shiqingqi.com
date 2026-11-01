import { eq } from "drizzle-orm";
import {
  mailSenderRules,
  type SenderRuleBucket,
  type SenderRuleMatch,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";
import type { SenderRule } from "./types.ts";

/**
 * Saves a drafted rule for the user to confirm. A draft for the same sender
 * replaces the earlier one; a confirmed rule for that sender goes back to
 * draft until the user confirms the change.
 */
async function saveDraft(
  { db, userId }: UserScope,
  draft: {
    match: SenderRuleMatch;
    pattern: string;
    bucket: SenderRuleBucket;
    categoryId: string | null;
    sourceMessageId: string | null;
  },
): Promise<string> {
  const values = {
    ...draft,
    pattern: draft.pattern.trim().toLowerCase(),
    status: "draft" as const,
    confirmedAt: null,
  };
  const [row] = await db
    .insert(mailSenderRules)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [
        mailSenderRules.userId,
        mailSenderRules.match,
        mailSenderRules.pattern,
      ],
      set: values,
    })
    .returning({ id: mailSenderRules.id });
  return row.id;
}

/** Turns a draft into a rule that classification applies. False when there is no such rule. */
async function confirm(
  { db }: UserScope,
  ruleId: string,
  now: Date,
): Promise<boolean> {
  const updated = await db
    .update(mailSenderRules)
    .set({ status: "confirmed", confirmedAt: now })
    .where(eq(mailSenderRules.id, ruleId))
    .returning({ id: mailSenderRules.id });
  return updated.length > 0;
}

function listConfirmed({ db }: UserScope): Promise<SenderRule[]> {
  return db
    .select({
      id: mailSenderRules.id,
      match: mailSenderRules.match,
      pattern: mailSenderRules.pattern,
      bucket: mailSenderRules.bucket,
      categoryId: mailSenderRules.categoryId,
    })
    .from(mailSenderRules)
    .where(eq(mailSenderRules.status, "confirmed"));
}

/** The storage of sender rules. A correction drafts one; the user confirms it. */
export const senderRules = { saveDraft, confirm, listConfirmed };
