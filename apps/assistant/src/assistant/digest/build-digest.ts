import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { AssistantModel } from "#src/assistant/ai/get-classifier-model.ts";
import {
  mailClassifications,
  mailDigests,
  mailMessages,
  type DigestArranger,
  type UserLocale,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import { dueReportDate, localClock } from "../report/due-report-date.ts";
import { readReportSettings } from "../report/read-report-settings.ts";
import { arrangeDigest } from "./arrange-digest.ts";
import type { DigestMail } from "./group-by-thread.ts";
import type { DigestContent, DigestSection } from "./types.ts";

/** The window of the first digest, when there is no earlier one. */
const FIRST_WINDOW_MS = 24 * 60 * 60 * 1000;
const SAMPLE_DAYS = 7;
export const SAMPLE_SIZE = 10;
const SUNDAY = 0;

export interface DigestBuildDeps {
  /** Null when no API key is set: then the code arranges the digest. */
  model: AssistantModel | null;
  now: () => Date;
}

export interface BuiltDigest {
  id: string;
  localDate: string;
  headline: string | null;
  arrangedBy: DigestArranger;
  locale: UserLocale;
  counts: Record<DigestSection, number>;
}

const classified = {
  classificationId: mailClassifications.id,
  bucket: mailClassifications.bucket,
  classifiedAt: mailClassifications.classifiedAt,
  facts: mailClassifications.facts,
  summary: mailClassifications.summary,
  event: mailClassifications.event,
  categoryId: mailClassifications.categoryId,
  messageId: mailMessages.messageId,
  inReplyTo: mailMessages.inReplyTo,
  references: mailMessages.references,
  fromName: mailMessages.fromName,
  fromAddress: mailMessages.fromAddress,
  subject: mailMessages.subject,
  receivedAt: mailMessages.receivedAt,
};

/**
 * What one digest shows: every open `act` item, also the ones of earlier
 * days, and the rest of the mail classified in the window. Old mail that
 * history import classified never takes part.
 */
async function readDigestMail(
  { db }: UserScope,
  { windowStart, builtAt }: { windowStart: Date; builtAt: Date },
) {
  const rows = await db
    .select(classified)
    .from(mailClassifications)
    .innerJoin(mailMessages, eq(mailMessages.id, mailClassifications.messageId))
    .where(
      and(
        eq(mailMessages.origin, "live"),
        lte(mailClassifications.classifiedAt, builtAt),
        isNull(mailClassifications.doneAt),
        or(
          eq(mailClassifications.bucket, "act"),
          gt(mailClassifications.classifiedAt, windowStart),
        ),
      ),
    );
  const mails: DigestMail[] = [];
  const calendar: { id: string; start: string }[] = [];
  const filed = new Map<string | null, number>();
  for (const row of rows) {
    const inWindow = row.classifiedAt > windowStart;
    if (inWindow && row.event) {
      calendar.push({ id: row.classificationId, start: row.event.start });
    }
    if (row.bucket === "filed") {
      filed.set(row.categoryId, (filed.get(row.categoryId) ?? 0) + 1);
      continue;
    }
    mails.push({
      classificationId: row.classificationId,
      section: row.bucket,
      messageId: row.messageId,
      inReplyTo: row.inReplyTo,
      references: row.references,
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      subject: row.subject,
      summary: row.summary,
      receivedAt: row.receivedAt,
      dueDate: row.facts?.dueDate ?? null,
      carriedOver: !inWindow,
    });
  }
  return {
    mails,
    calendar: calendar
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
      .map(({ id }) => id),
    filed: [...filed]
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Up to ten filed mails of the last week, at random, for the user to check that filing is right. */
async function readFiledSample({ db }: UserScope, builtAt: Date) {
  const since = new Date(builtAt.getTime() - SAMPLE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: mailClassifications.id })
    .from(mailClassifications)
    .innerJoin(mailMessages, eq(mailMessages.id, mailClassifications.messageId))
    .where(
      and(
        eq(mailMessages.origin, "live"),
        eq(mailClassifications.bucket, "filed"),
        isNull(mailClassifications.doneAt),
        gt(mailClassifications.classifiedAt, since),
        lte(mailClassifications.classifiedAt, builtAt),
      ),
    )
    .orderBy(sql`random()`)
    .limit(SAMPLE_SIZE);
  return rows.map((row) => row.id);
}

/**
 * Builds the user's digest when one is due (see `dueDigestDate`), and
 * returns it; null when none is due or another run built it first. The AI
 * call runs outside a transaction, and a failed call never stops the
 * digest: the code arranges it then.
 */
export async function buildDigest(
  { db, userId }: { db: AssistantDb; userId: string },
  deps: DigestBuildDeps,
): Promise<BuiltDigest | null> {
  const builtAt = deps.now();
  const plan = await withUser(db, userId, async (scope) => {
    const settings = await readReportSettings(scope);
    const latest = (
      await scope.db
        .select({
          localDate: mailDigests.localDate,
          builtAt: mailDigests.builtAt,
        })
        .from(mailDigests)
        .orderBy(desc(mailDigests.localDate))
        .limit(1)
    ).at(0);
    const localDate = dueReportDate({
      now: builtAt,
      timeZone: settings.timeZone,
      reportHour: settings.digestHour,
      latestReportDate: latest?.localDate ?? null,
    });
    if (!localDate) return null;
    const windowStart =
      latest?.builtAt ?? new Date(builtAt.getTime() - FIRST_WINDOW_MS);
    const isSunday = localClock(builtAt, settings.timeZone).weekday === SUNDAY;
    return {
      settings,
      localDate,
      windowStart,
      ...(await readDigestMail(scope, { windowStart, builtAt })),
      sample: isSunday ? await readFiledSample(scope, builtAt) : [],
    };
  });
  if (!plan) return null;

  const arrangement = await arrangeDigest({
    mails: plan.mails,
    model: deps.model,
    locale: plan.settings.locale,
    today: plan.localDate,
  });
  const content: DigestContent = {
    version: 1,
    sections: arrangement.sections,
    calendar: plan.calendar,
    filed: plan.filed,
    sample: plan.sample,
  };
  const stored = (
    await withUser(db, userId, ({ db }) =>
      db
        .insert(mailDigests)
        .values({
          userId,
          localDate: plan.localDate,
          windowStart: plan.windowStart,
          builtAt,
          headline: arrangement.headline,
          arrangedBy: arrangement.arrangedBy,
          modelId: arrangement.modelId,
          promptVersion: arrangement.promptVersion,
          content,
        })
        .onConflictDoNothing({
          target: [mailDigests.userId, mailDigests.localDate],
        })
        .returning({ id: mailDigests.id }),
    )
  ).at(0);
  if (!stored) return null;
  return {
    id: stored.id,
    localDate: plan.localDate,
    headline: arrangement.headline,
    arrangedBy: arrangement.arrangedBy,
    locale: plan.settings.locale,
    counts: {
      act: content.sections.act.length,
      unsure: content.sections.unsure.length,
      fyi: content.sections.fyi.length,
    },
  };
}
