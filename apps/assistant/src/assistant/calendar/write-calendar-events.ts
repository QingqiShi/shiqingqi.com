import { randomUUID } from "node:crypto";
import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import {
  calendarEvents,
  calendarWrites,
  DEFAULT_TIME_ZONE,
  mailAccounts,
  mailClassifications,
  mailMessages,
  userSettings,
  type CalendarWriteResult,
  type UserLocale,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { openOriginalHref } from "#src/assistant/digest/open-original-href.ts";
import {
  resolveMailboxAuth,
  type MailboxAuthDeps,
} from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { describeSyncError } from "#src/assistant/mail/sync/describe-sync-error.ts";
import { CalendarAuthError } from "./caldav/calendar-auth-error.ts";
import type {
  CalendarConnector,
  CalendarInfo,
  CalendarSession,
} from "./caldav/types.ts";
import { buildEventIcs } from "./ics/build-event-ics.ts";
import {
  entryOfEvent,
  spanOfEntry,
  type CalendarEntry,
} from "./ics/entry-of-event.ts";
import { readIcsEvents } from "./ics/read-ics-events.ts";
import { isDuplicate, planCalendarWrite } from "./plan-calendar-write.ts";

/** After this many failed attempts, the app leaves an event alone until the user adds it. */
export const MAX_CALENDAR_FAILURES = 5;
/** How long adding one event from the digest may take. */
export const ADD_EVENT_BUDGET_MS = 30_000;
const CANDIDATE_LIMIT = 100;
const NEAR_MS = 6 * 60 * 1000;

/** The name of the app's own calendar, in the user's language when the app makes it. */
export const CALENDAR_NAMES: Record<UserLocale, string> = {
  en: "Mail Assistant",
  zh: "邮件助手",
};

const OPEN_MAIL: Record<UserLocale, string> = {
  en: "Open the mail",
  zh: "打开原邮件",
};

export const CALENDAR_ERROR_CODES = [
  "calendar_login_refused",
  "calendar_failed",
] as const;
export type CalendarErrorCode = (typeof CALENDAR_ERROR_CODES)[number];

export interface CalendarDeps {
  connector: CalendarConnector;
  auth: MailboxAuthDeps;
}

export interface CalendarRunResult {
  /** False when the user has no iCloud account to write to. */
  available: boolean;
  /** What happened to each event the run came to; null when it failed. */
  results: Map<string, CalendarWriteResult | null>;
}

/** The iCloud account whose calendar the app writes to: the first one the user connected. */
export function readCalendarAccount(db: AssistantDb, userId: string) {
  return withUser(
    db,
    userId,
    async ({ db }) =>
      (
        await db
          .select({
            id: mailAccounts.id,
            provider: mailAccounts.provider,
            address: mailAccounts.address,
            credential: mailAccounts.credential,
            calendarUrl: mailAccounts.calendarUrl,
            createdAt: mailAccounts.createdAt,
          })
          .from(mailAccounts)
          .where(
            and(
              eq(mailAccounts.provider, "icloud"),
              ne(mailAccounts.status, "reconnect"),
            ),
          )
          .orderBy(asc(mailAccounts.createdAt))
          .limit(1)
      ).at(0) ?? null,
  );
}

type CalendarAccount = NonNullable<
  Awaited<ReturnType<typeof readCalendarAccount>>
>;

function readSettings(db: AssistantDb, userId: string) {
  return withUser(db, userId, async ({ db }) => {
    const row = (
      await db
        .select({
          on: userSettings.calendarEvents,
          since: userSettings.calendarEventsSince,
          locale: userSettings.locale,
          timeZone: userSettings.timeZone,
        })
        .from(userSettings)
    ).at(0);
    return {
      on: row?.on ?? true,
      since: row?.since ?? null,
      locale: row?.locale ?? "en",
      timeZone: row?.timeZone ?? DEFAULT_TIME_ZONE,
    };
  });
}

/**
 * Classified `live` mail with an event that the app has not handled. On its
 * own the app takes only `sure` events of mail classified since the user
 * could have expected it: since the iCloud account was connected and the
 * switch was last turned on. With `classificationIds`, the user asked for
 * those events, sure or not.
 */
function readCandidates(
  db: AssistantDb,
  userId: string,
  {
    since,
    classificationIds,
  }: { since: Date; classificationIds: readonly string[] | undefined },
) {
  return withUser(db, userId, ({ db }) =>
    db
      .select({
        classificationId: mailClassifications.id,
        event: sql<MailEvent>`${mailClassifications.event}`,
        summary: mailClassifications.summary,
        messageId: mailMessages.messageId,
        inReplyTo: mailMessages.inReplyTo,
        references: mailMessages.references,
        fromAddress: mailMessages.fromAddress,
        subject: mailMessages.subject,
        provider: mailAccounts.provider,
        accountAddress: mailAccounts.address,
      })
      .from(mailClassifications)
      .innerJoin(
        mailMessages,
        eq(mailMessages.id, mailClassifications.messageId),
      )
      .innerJoin(mailAccounts, eq(mailAccounts.id, mailMessages.accountId))
      .leftJoin(
        calendarWrites,
        eq(calendarWrites.classificationId, mailClassifications.id),
      )
      .where(
        and(
          sql`${mailClassifications.event} is not null`,
          eq(mailMessages.origin, "live"),
          isNull(calendarWrites.writtenAt),
          classificationIds
            ? inArray(mailClassifications.id, [...classificationIds])
            : and(
                sql`${mailClassifications.event}->>'certainty' = 'sure'`,
                gte(mailClassifications.classifiedAt, since),
                or(
                  isNull(calendarWrites.failures),
                  lt(calendarWrites.failures, MAX_CALENDAR_FAILURES),
                ),
              ),
        ),
      )
      .orderBy(asc(mailMessages.receivedAt))
      .limit(CANDIDATE_LIMIT),
  );
}

type Candidate = Awaited<ReturnType<typeof readCandidates>>[number];

interface RunContext {
  db: AssistantDb;
  userId: string;
  session: CalendarSession;
  account: CalendarAccount;
  calendarUrl: string;
  calendars: CalendarInfo[];
  locale: UserLocale;
  timeZone: string;
  now: () => Date;
}

/** The app's calendar: the one it remembers, else one with its name, else a new one. */
async function ensureCalendar(
  session: CalendarSession,
  account: CalendarAccount,
  locale: UserLocale,
) {
  const calendars = await session.listCalendars();
  const remembered = calendars.find(
    (entry) => entry.url === account.calendarUrl,
  );
  if (remembered) return { calendarUrl: remembered.url, calendars };
  const names = new Set(Object.values(CALENDAR_NAMES));
  const named = calendars.find((entry) => names.has(entry.displayName));
  if (named) return { calendarUrl: named.url, calendars };
  const created = await session.createCalendar(CALENDAR_NAMES[locale]);
  return { calendarUrl: created.url, calendars: [...calendars, created] };
}

function threadIdsOf(mail: Candidate) {
  return [
    ...new Set(
      [mail.messageId, mail.inReplyTo, ...mail.references].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
}

function descriptionOf(context: RunContext, mail: Candidate) {
  const href = openOriginalHref({
    provider: mail.provider,
    accountAddress: mail.accountAddress,
    messageId: mail.messageId,
    fromAddress: mail.fromAddress,
    subject: mail.subject,
  });
  const line = mail.summary ?? mail.subject;
  return {
    href,
    description: [line, `${OPEN_MAIL[context.locale]}: ${href}`]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function saveResult(
  context: RunContext,
  classificationId: string,
  result: CalendarWriteResult,
  eventId: string | null,
) {
  const now = context.now();
  const values = {
    result,
    eventId,
    lastError: null,
    writtenAt: now,
    updatedAt: now,
  };
  return withUser(context.db, context.userId, ({ db, userId }) =>
    db
      .insert(calendarWrites)
      .values({ classificationId, userId, ...values })
      .onConflictDoUpdate({
        target: calendarWrites.classificationId,
        set: values,
      }),
  );
}

function saveFailure(
  context: Pick<RunContext, "db" | "userId" | "now">,
  classificationId: string,
  error: unknown,
) {
  const now = context.now();
  const lastError = describeSyncError(error).message;
  return withUser(context.db, context.userId, ({ db, userId }) =>
    db
      .insert(calendarWrites)
      .values({
        classificationId,
        userId,
        failures: 1,
        lastError,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: calendarWrites.classificationId,
        set: {
          failures: sql`${calendarWrites.failures} + 1`,
          lastError,
          updatedAt: now,
        },
      }),
  );
}

function findThreadEvent(context: RunContext, threadIds: string[]) {
  return withUser(
    context.db,
    context.userId,
    async ({ db }) =>
      (
        await db
          .select()
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.accountId, context.account.id),
              arrayOverlaps(calendarEvents.threadIds, threadIds),
            ),
          )
          .orderBy(desc(calendarEvents.updatedAt))
          .limit(1)
      ).at(0) ?? null,
  );
}

type StoredEvent = NonNullable<Awaited<ReturnType<typeof findThreadEvent>>>;

/** True when one of the user's calendars, the app's own among them, has the entry already. */
async function hasDuplicate(
  context: RunContext,
  entry: CalendarEntry,
  span: { start: number; end: number },
) {
  const range = {
    start: new Date(span.start - NEAR_MS),
    end: new Date(Math.max(span.end, span.start) + NEAR_MS),
  };
  for (const calendar of context.calendars) {
    const objects = await context.session.listEvents(calendar.url, range);
    for (const object of objects) {
      const found = readIcsEvents(object.data, context.timeZone).some((other) =>
        isDuplicate(entry, span.start, other, context.timeZone),
      );
      if (found) return true;
    }
  }
  return false;
}

/** Only resources inside the app's calendar may change: never an event of the user's own. */
function isOwnResource(context: RunContext, url: string) {
  return url.startsWith(context.calendarUrl);
}

function mergedThreadIds(stored: StoredEvent, threadIds: string[]) {
  return [...new Set([...stored.threadIds, ...threadIds])];
}

async function createEvent(
  context: RunContext,
  mail: Candidate,
  entry: CalendarEntry,
  threadIds: string[],
) {
  const uid = `${randomUUID()}@assistant.qingqi.dev`;
  const { href, description } = descriptionOf(context, mail);
  const data = buildEventIcs({
    uid,
    sequence: 0,
    entry,
    description,
    url: href,
    now: context.now(),
  });
  const { url } = await context.session.createEvent(
    context.calendarUrl,
    `${uid.slice(0, uid.indexOf("@"))}.ics`,
    data,
  );
  const [stored] = await withUser(
    context.db,
    context.userId,
    ({ db, userId }) =>
      db
        .insert(calendarEvents)
        .values({
          userId,
          accountId: context.account.id,
          uid,
          url,
          threadIds,
          event: mail.event,
        })
        .returning({ id: calendarEvents.id }),
  );
  return stored.id;
}

async function writeOne(context: RunContext, mail: Candidate) {
  const entry = entryOfEvent(mail.event, context.locale);
  const span = spanOfEntry(entry.timing);
  const threadIds = threadIdsOf(mail);
  const stored = await findThreadEvent(context, threadIds);
  const plan = planCalendarWrite({
    change: mail.event.change,
    endsAt: span.end,
    now: context.now(),
    threadEvent: stored
      ? { id: stored.id, cancelled: stored.cancelledAt !== null }
      : null,
  });
  if (plan.action === "skip") {
    await saveResult(context, mail.classificationId, plan.result, null);
    return plan.result;
  }
  if (plan.action === "create") {
    if (await hasDuplicate(context, entry, span)) {
      await saveResult(context, mail.classificationId, "duplicate", null);
      return "duplicate";
    }
    const eventId = await createEvent(context, mail, entry, threadIds);
    await saveResult(context, mail.classificationId, "created", eventId);
    return "created";
  }
  if (!stored || !isOwnResource(context, stored.url)) {
    await saveResult(context, mail.classificationId, "unmatched", null);
    return "unmatched";
  }
  const current = await context.session.getEvent(stored.url);
  if (plan.action === "delete") {
    if (current) await context.session.deleteEvent(stored.url, current.etag);
    await withUser(context.db, context.userId, ({ db }) =>
      db
        .update(calendarEvents)
        .set({
          cancelledAt: context.now(),
          threadIds: mergedThreadIds(stored, threadIds),
          updatedAt: context.now(),
        })
        .where(eq(calendarEvents.id, stored.id)),
    );
    await saveResult(context, mail.classificationId, "cancelled", stored.id);
    return "cancelled";
  }
  if (!current) {
    // The user deleted the event from the app's calendar: leave it deleted.
    await saveResult(context, mail.classificationId, "unmatched", stored.id);
    return "unmatched";
  }
  const sequence = stored.sequence + 1;
  const { href, description } = descriptionOf(context, mail);
  await context.session.updateEvent(
    stored.url,
    buildEventIcs({
      uid: stored.uid,
      sequence,
      entry,
      description,
      url: href,
      now: context.now(),
    }),
    current.etag,
  );
  await withUser(context.db, context.userId, ({ db }) =>
    db
      .update(calendarEvents)
      .set({
        event: mail.event,
        sequence,
        threadIds: mergedThreadIds(stored, threadIds),
        updatedAt: context.now(),
      })
      .where(eq(calendarEvents.id, stored.id)),
  );
  await saveResult(context, mail.classificationId, "updated", stored.id);
  return "updated";
}

function calendarErrorOf(error: unknown) {
  return {
    calendarErrorCode: (error instanceof CalendarAuthError
      ? "calendar_login_refused"
      : "calendar_failed") satisfies CalendarErrorCode,
    calendarErrorMessage: describeSyncError(error).message,
  };
}

/**
 * Writes the events of classified mail to the app's calendar in the user's
 * first iCloud account: makes the calendar when it is missing, makes an
 * event for new mail, and changes or deletes the thread's event for a
 * later mail that changes or cancels it. Before it makes an event, it reads
 * the user's calendars and skips an event that is there already. It writes
 * only inside its own calendar. Failures show on the account.
 */
export async function writeCalendarEvents(
  {
    db,
    userId,
    endsAt,
    classificationIds,
  }: {
    db: AssistantDb;
    userId: string;
    endsAt: number;
    /** Events the user asked for from the digest, written even when unsure or switched off. */
    classificationIds?: readonly string[];
  },
  deps: CalendarDeps,
): Promise<CalendarRunResult> {
  const now = deps.auth.now;
  const results = new Map<string, CalendarWriteResult | null>();
  const account = await readCalendarAccount(db, userId);
  if (!account) return { available: false, results };
  const settings = await readSettings(db, userId);
  if (classificationIds?.length === 0) return { available: true, results };
  if (!classificationIds && !settings.on) return { available: true, results };
  const since = new Date(
    Math.max(account.createdAt.getTime(), settings.since?.getTime() ?? 0),
  );
  const candidates = await readCandidates(db, userId, {
    since,
    classificationIds,
  });
  if (candidates.length === 0) return { available: true, results };

  const errors: unknown[] = [];
  try {
    const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
    if (!("pass" in auth)) throw new Error("An iCloud account has no password");
    const session = await deps.connector({
      user: auth.user,
      pass: auth.pass,
    });
    const { calendarUrl, calendars } = await ensureCalendar(
      session,
      account,
      settings.locale,
    );
    if (calendarUrl !== account.calendarUrl) {
      await withUser(db, userId, ({ db }) =>
        db
          .update(mailAccounts)
          .set({ calendarUrl, updatedAt: now() })
          .where(eq(mailAccounts.id, account.id)),
      );
    }
    const context: RunContext = {
      db,
      userId,
      session,
      account,
      calendarUrl,
      calendars,
      locale: settings.locale,
      timeZone: settings.timeZone,
      now,
    };
    for (const mail of candidates) {
      if (now().getTime() >= endsAt) break;
      try {
        results.set(mail.classificationId, await writeOne(context, mail));
      } catch (error) {
        errors.push(error);
        results.set(mail.classificationId, null);
        await saveFailure(context, mail.classificationId, error);
      }
    }
  } catch (error) {
    errors.push(error);
    for (const mail of candidates) {
      results.set(mail.classificationId, null);
      await saveFailure({ db, userId, now }, mail.classificationId, error);
    }
  }
  await withUser(db, userId, ({ db }) =>
    db
      .update(mailAccounts)
      .set(
        errors.length > 0
          ? { ...calendarErrorOf(errors.at(-1)), calendarErrorAt: now() }
          : {
              calendarErrorCode: null,
              calendarErrorMessage: null,
              calendarErrorAt: null,
            },
      )
      .where(eq(mailAccounts.id, account.id)),
  );
  return { available: true, results };
}
