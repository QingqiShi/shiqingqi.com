import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { senderRules } from "#src/assistant/classify/sender-rules.ts";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import {
  calendarWrites,
  mailAccounts,
  mailCategories,
  mailClassifications,
  mailCorrections,
  mailDigests,
  mailMessages,
  type CalendarWriteResult,
  type CorrectionKind,
  type MailBucket,
  type SenderRuleBucket,
  type SenderRuleMatch,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";
import { readDigestSettings } from "./build-digest.ts";
import { openOriginalHref } from "./open-original-href.ts";
import { DIGEST_SECTIONS, perSection } from "./per-section.ts";
import { type DigestContent, type DigestSection } from "./types.ts";

/** One mail of a digest, with its state now. */
export interface DigestMailView {
  classificationId: string;
  bucket: MailBucket;
  fromName: string | null;
  fromAddress: string | null;
  subject: string;
  summary: string | null;
  receivedAt: Date;
  categoryName: string | null;
  event: MailEvent | null;
  /** What the app did with the event in the calendar; null while it did nothing. */
  calendarResult: CalendarWriteResult | null;
  doneAt: Date | null;
  corrections: CorrectionKind[];
  openHref: string;
}

export type DigestItemState = "open" | "done" | "dismissed";

/** One item: a thread in a section. */
export interface DigestItemView {
  ids: string[];
  /** The model's sentence, else the newest mail's summary, else its subject; null for a mail without one. */
  line: string | null;
  newest: DigestMailView;
  count: number;
  carriedOver: boolean;
  state: DigestItemState;
  dueDate: string | null;
}

export interface DraftRuleView {
  id: string;
  match: SenderRuleMatch;
  pattern: string;
  bucket: SenderRuleBucket;
  categoryName: string | null;
}

export interface DigestView {
  id: string;
  localDate: string;
  windowStart: Date;
  builtAt: Date;
  headline: string | null;
  sections: Record<DigestSection, DigestItemView[]>;
  calendar: DigestMailView[];
  filed: { categoryName: string | null; count: number }[];
  sample: DigestMailView[];
  timeZone: string;
  /** The user has an iCloud account whose calendar the app can write to. */
  calendarAvailable: boolean;
}

function idsOf(content: DigestContent) {
  return [
    ...DIGEST_SECTIONS.flatMap((section) =>
      content.sections[section].flatMap((group) => group.ids),
    ),
    ...content.calendar,
    ...content.sample,
  ];
}

async function readMails(
  { db }: UserScope,
  ids: readonly string[],
): Promise<Map<string, DigestMailView & { dueDate: string | null }>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      classificationId: mailClassifications.id,
      bucket: mailClassifications.bucket,
      summary: mailClassifications.summary,
      event: mailClassifications.event,
      calendarResult: calendarWrites.result,
      facts: mailClassifications.facts,
      doneAt: mailClassifications.doneAt,
      categoryName: mailCategories.name,
      messageId: mailMessages.messageId,
      fromName: mailMessages.fromName,
      fromAddress: mailMessages.fromAddress,
      subject: mailMessages.subject,
      receivedAt: mailMessages.receivedAt,
      provider: mailAccounts.provider,
      accountAddress: mailAccounts.address,
      corrections: sql<
        CorrectionKind[]
      >`coalesce((select array_agg(${mailCorrections.kind}) from ${mailCorrections} where ${mailCorrections.messageId} = ${mailMessages.id}), '{}')`,
    })
    .from(mailClassifications)
    .innerJoin(mailMessages, eq(mailMessages.id, mailClassifications.messageId))
    .innerJoin(mailAccounts, eq(mailAccounts.id, mailMessages.accountId))
    .leftJoin(
      calendarWrites,
      eq(calendarWrites.classificationId, mailClassifications.id),
    )
    .leftJoin(
      mailCategories,
      eq(mailCategories.id, mailClassifications.categoryId),
    )
    .where(inArray(mailClassifications.id, [...new Set(ids)]));
  return new Map(
    rows.map((row) => [
      row.classificationId,
      {
        classificationId: row.classificationId,
        bucket: row.bucket,
        fromName: row.fromName,
        fromAddress: row.fromAddress,
        subject: row.subject,
        summary: row.summary,
        receivedAt: row.receivedAt,
        categoryName: row.categoryName,
        event: row.event,
        calendarResult: row.calendarResult,
        doneAt: row.doneAt,
        corrections: row.corrections,
        dueDate: row.facts?.dueDate ?? null,
        openHref: openOriginalHref({
          provider: row.provider,
          accountAddress: row.accountAddress,
          messageId: row.messageId,
          fromAddress: row.fromAddress,
          subject: row.subject,
        }),
      },
    ]),
  );
}

function stateOf(mails: readonly DigestMailView[]): DigestItemState {
  if (mails.some((mail) => mail.corrections.includes("not_important"))) {
    return "dismissed";
  }
  return mails.every((mail) => mail.doneAt !== null) ? "done" : "open";
}

/** A digest with the state of each of its items now; null when there is none. Without a date, the newest. */
export async function readDigest(
  scope: UserScope,
  localDate: string | null,
): Promise<DigestView | null> {
  const digest = (
    await scope.db
      .select()
      .from(mailDigests)
      .where(localDate ? eq(mailDigests.localDate, localDate) : undefined)
      .orderBy(desc(mailDigests.localDate))
      .limit(1)
  ).at(0);
  if (!digest) return null;
  const { content } = digest;
  const mails = await readMails(scope, idsOf(content));
  const pick = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const mail = mails.get(id);
      return mail ? [mail] : [];
    });
  const categoryIds = content.filed.flatMap((entry) =>
    entry.categoryId ? [entry.categoryId] : [],
  );
  const names = new Map(
    categoryIds.length === 0
      ? []
      : (
          await scope.db
            .select({ id: mailCategories.id, name: mailCategories.name })
            .from(mailCategories)
            .where(inArray(mailCategories.id, categoryIds))
        ).map((row) => [row.id, row.name]),
  );
  const settings = await readDigestSettings(scope);
  return {
    id: digest.id,
    localDate: digest.localDate,
    windowStart: digest.windowStart,
    builtAt: digest.builtAt,
    headline: digest.headline,
    sections: perSection((section) =>
      content.sections[section].flatMap((group) => {
        const groupMails = pick(group.ids);
        const newest = groupMails.at(0);
        if (!newest) return [];
        const dueDates = groupMails.flatMap((mail) =>
          mail.dueDate ? [mail.dueDate] : [],
        );
        return [
          {
            ids: groupMails.map((mail) => mail.classificationId),
            line: group.line ?? newest.summary ?? (newest.subject || null),
            newest,
            count: groupMails.length,
            carriedOver: group.carriedOver,
            state: stateOf(groupMails),
            dueDate: dueDates.sort().at(0) ?? null,
          },
        ];
      }),
    ),
    calendar: pick(content.calendar),
    filed: content.filed.map((entry) => ({
      categoryName: entry.categoryId
        ? (names.get(entry.categoryId) ?? null)
        : null,
      count: entry.count,
    })),
    sample: pick(content.sample),
    timeZone: settings.timeZone,
    calendarAvailable:
      (
        await scope.db
          .select({ id: mailAccounts.id })
          .from(mailAccounts)
          .where(
            and(
              eq(mailAccounts.provider, "icloud"),
              ne(mailAccounts.status, "reconnect"),
            ),
          )
          .limit(1)
      ).length > 0,
  };
}

/** Every digest of the user, newest first, with how many items each had. */
export async function listDigests({ db }: UserScope) {
  const rows = await db
    .select({
      localDate: mailDigests.localDate,
      headline: mailDigests.headline,
      content: mailDigests.content,
    })
    .from(mailDigests)
    .orderBy(desc(mailDigests.localDate))
    .limit(400);
  return rows.map((row) => ({
    localDate: row.localDate,
    headline: row.headline,
    counts: perSection((section) => row.content.sections[section].length),
  }));
}

/** The sender rules that corrections drafted, for the user to confirm or dismiss. */
export async function listDraftRules(
  scope: UserScope,
): Promise<DraftRuleView[]> {
  const drafts = await senderRules.listDrafts(scope);
  const categoryIds = drafts.flatMap((rule) =>
    rule.categoryId ? [rule.categoryId] : [],
  );
  const names = new Map(
    categoryIds.length === 0
      ? []
      : (
          await scope.db
            .select({ id: mailCategories.id, name: mailCategories.name })
            .from(mailCategories)
            .where(inArray(mailCategories.id, categoryIds))
        ).map((row) => [row.id, row.name]),
  );
  return drafts.map((rule) => ({
    id: rule.id,
    match: rule.match,
    pattern: rule.pattern,
    bucket: rule.bucket,
    categoryName: rule.categoryId ? (names.get(rule.categoryId) ?? null) : null,
  }));
}
