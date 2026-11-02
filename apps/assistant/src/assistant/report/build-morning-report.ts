import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import {
  mailAccounts,
  morningReports,
  todos,
  type UserLocale,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import type { MailboxDeps } from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { dueReportDate, localClock } from "./due-report-date.ts";
import { addDays } from "./local-day-bounds.ts";
import { readDayMail } from "./read-day-mail.ts";
import { readReportSettings } from "./read-report-settings.ts";
import type { MorningReportContent, ReportStatus } from "./types.ts";
import { pickMailForModel, writeReport } from "./write-report.ts";

/**
 * From this local hour on, a run that cannot write the report stores one
 * that says so. Before it, the run stores nothing and the next hour tries again.
 */
const LAST_TRY_HOUR = 23;

export interface ReportBuildDeps {
  /** Null when no API key is set: then the runs try again until the last try of the day. */
  model: AssistantModel | null;
  mail: MailboxDeps;
  now: () => Date;
}

export interface BuiltReport {
  id: string;
  localDate: string;
  locale: UserLocale;
  status: ReportStatus;
  headline: string | null;
  newTodos: number;
}

/** The report that is due now, or null when none is. */
async function readPlan({ db, userId }: UserScope, builtAt: Date) {
  if ((await db.$count(mailAccounts, eq(mailAccounts.userId, userId))) === 0) {
    return null;
  }
  const settings = await readReportSettings({ db, userId });
  const latest = (
    await db
      .select({ localDate: morningReports.localDate })
      .from(morningReports)
      .where(eq(morningReports.userId, userId))
      .orderBy(desc(morningReports.localDate))
      .limit(1)
  ).at(0);
  const localDate = dueReportDate({
    now: builtAt,
    timeZone: settings.timeZone,
    reportHour: settings.digestHour,
    latestReportDate: latest?.localDate ?? null,
  });
  if (!localDate) return null;
  const openTodos = await db
    .select({ id: todos.id, title: todos.title, detail: todos.detail })
    .from(todos)
    .where(and(eq(todos.userId, userId), isNull(todos.doneAt)))
    .orderBy(asc(todos.createdAt));
  return { settings, localDate, openTodos };
}

/**
 * Builds the user's morning report when one is due (see `dueReportDate`):
 * reads the mail of the day before from every mailbox, has the model write
 * the report and the new to-dos, and stores both in one transaction.
 * Returns null when none is due, the user has no mailbox, or another run
 * stored the day first. Returns "retry" and stores nothing when no mailbox
 * could be read or the model wrote no report, until the last try of the
 * day. The mail is never stored.
 */
export async function buildMorningReport(
  {
    db,
    userId,
    endsAt,
  }: {
    db: AssistantDb;
    userId: string;
    /** No new mail is fetched after this; the model call and the writes come after it. */
    endsAt: number;
  },
  deps: ReportBuildDeps,
): Promise<BuiltReport | "retry" | null> {
  const builtAt = deps.now();
  const plan = await readPlan({ db, userId }, builtAt);
  if (!plan) return null;

  const { settings, localDate } = plan;
  const lastTry = localClock(builtAt, settings.timeZone).hour >= LAST_TRY_HOUR;
  if (!deps.model && !lastTry) return "retry";
  const mailDate = addDays(localDate, -1);
  const day = await readDayMail(
    {
      db,
      userId,
      localDate: mailDate,
      timeZone: settings.timeZone,
      endsAt,
    },
    deps.mail,
  );
  const { picked, leftOut } = pickMailForModel(day.mails, settings.timeZone);
  const written = await writeReport({
    mails: picked,
    leftOut,
    openTodos: plan.openTodos,
    model: deps.model,
    locale: settings.locale,
    mailDate,
    today: localDate,
    timeZone: settings.timeZone,
  });
  const status: ReportStatus =
    day.readMailboxes === 0 && day.mails.length === 0
      ? "failed"
      : written.status;
  if ((status === "failed" || status === "no-model") && !lastTry) {
    return "retry";
  }
  const content: MorningReportContent = {
    version: 1,
    mailDate,
    status,
    promptVersion: written.promptVersion,
    headline: written.headline,
    needsAction: written.needsAction,
    worthKnowing: written.worthKnowing,
    rest: written.rest,
    mailCount: day.mails.length,
    leftOut,
    notRead: day.notRead,
    ranOutOfTime: day.ranOutOfTime,
    unreadMailboxes: day.unreadMailboxes,
  };

  const stored = await db.transaction(async (tx) => {
    const report = (
      await tx
        .insert(morningReports)
        .values({
          userId,
          localDate,
          content,
          modelId: written.modelId,
          builtAt,
        })
        .onConflictDoNothing({
          target: [morningReports.userId, morningReports.localDate],
        })
        .returning({ id: morningReports.id })
    ).at(0);
    if (!report) return null;
    if (written.todos.length > 0) {
      await tx.insert(todos).values(
        written.todos.map((todo) => ({
          userId,
          title: todo.title,
          detail: todo.detail,
          dueDate: todo.dueDate,
          sourceAccountId: todo.source?.accountId ?? null,
          sourceMessageId: todo.source?.messageId ?? null,
          createdReportId: report.id,
          createdAt: builtAt,
        })),
      );
    }
    return report;
  });
  if (!stored) return null;
  return {
    id: stored.id,
    localDate,
    locale: settings.locale,
    status,
    headline: written.headline,
    newTodos: written.todos.length,
  };
}
