import { desc, eq } from "drizzle-orm";
import { RunCalendars } from "#src/assistant/agent/calendar/run-calendars.ts";
import { RunMailboxes } from "#src/assistant/agent/mail/run-mailboxes.ts";
import {
  applyTodoChanges,
  readOpenTodos,
} from "#src/assistant/agent/todos/create-todo-tools.ts";
import type { AgentModels } from "#src/assistant/ai/get-agent-models.ts";
import type { CalendarConnector } from "#src/assistant/calendar/caldav/types.ts";
import {
  mailAccounts,
  morningReports,
  type UserLocale,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import type { MailboxDeps } from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { dueReportDate, localClock } from "./due-report-date.ts";
import {
  addDays,
  localDayBounds,
  reportMailWindow,
} from "./local-day-bounds.ts";
import { readReportSettings } from "./read-report-settings.ts";
import { runReportAgent, type ReportAgentResult } from "./run-report-agent.ts";
import type { MorningReportContent, MorningReportContentV2 } from "./types.ts";

/**
 * From this local hour on, a run that cannot write the report stores one
 * that says so. Before it, the run stores nothing and the next hour tries again.
 */
const LAST_TRY_HOUR = 23;

/** A mailbox that fails to open gets this many more tries in the run, this long apart. */
const LOGIN_RETRIES = 2;
const LOGIN_RETRY_WAIT_MS = 60_000;

/** A report looks back over at most this many stored reports for the mail a mailbox missed. */
const MAX_REPORTS_BACK = 7;

export interface ReportBuildDeps {
  /** Null when no API key is set: then the runs try again until the last try of the day. */
  models: AgentModels | null;
  mail: MailboxDeps;
  calendarConnector: CalendarConnector;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}

export interface BuiltReport {
  id: string;
  localDate: string;
  locale: UserLocale;
  status: MorningReportContentV2["status"];
  headline: string | null;
  newTodos: number;
  /** The mails marked read once the report was stored. */
  markedRead: number;
}

/** The report that is due now, or null when none is. */
async function readPlan({ db, userId }: UserScope, builtAt: Date) {
  const accounts = await db
    .select({ id: mailAccounts.id, address: mailAccounts.address })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId));
  if (accounts.length === 0) return null;
  const settings = await readReportSettings({ db, userId });
  const recentReports = await db
    .select({
      localDate: morningReports.localDate,
      content: morningReports.content,
    })
    .from(morningReports)
    .where(eq(morningReports.userId, userId))
    .orderBy(desc(morningReports.localDate))
    .limit(MAX_REPORTS_BACK);
  const localDate = dueReportDate({
    now: builtAt,
    timeZone: settings.timeZone,
    reportHour: settings.digestHour,
    latestReportDate: recentReports.at(0)?.localDate ?? null,
  });
  if (!localDate) return null;
  return { accounts, settings, localDate, recentReports };
}

/**
 * The `mailDate` of the oldest report in the unbroken run of newest reports
 * that could not read the account; null when the newest report read it.
 */
function firstMailDay(
  accountId: string,
  recentReports: readonly { content: MorningReportContent }[],
) {
  let since: string | null = null;
  for (const { content } of recentReports) {
    const missed = content.unreadMailboxes.some(
      (box) => box.accountId === accountId,
    );
    if (!missed) break;
    since = content.mailDate;
  }
  return since;
}

/**
 * Builds the user's morning report when one is due (see `dueReportDate`):
 * the report agent reads the mail of the report's window and today's
 * calendar, and submits the report; the report and the agent's to-do changes
 * are stored in one transaction. Only then is the mail of that window marked
 * read. A mailbox that cannot be read does not delay the report: the report
 * says so, and the next report that can read the mailbox also covers the mail
 * it missed. Returns null when none is due, the user has no mailbox, or
 * another run stored the day first. Returns "retry" and stores nothing when
 * no mailbox can be read or the agent submits no report,
 * until the last try of the day. The mail is never stored.
 */
export async function buildMorningReport(
  {
    db,
    userId,
    endsAt,
  }: {
    db: AssistantDb;
    userId: string;
    /** The agent must submit by this time; the writes come after it. */
    endsAt: number;
  },
  deps: ReportBuildDeps,
): Promise<BuiltReport | "retry" | null> {
  const builtAt = deps.now();
  const plan = await readPlan({ db, userId }, builtAt);
  if (!plan) return null;

  const { settings, localDate, recentReports } = plan;
  const lastTry = localClock(builtAt, settings.timeZone).hour >= LAST_TRY_HOUR;
  if (!deps.models && !lastTry) return "retry";
  const mailWindow = reportMailWindow(
    localDate,
    settings.digestHour,
    settings.timeZone,
  );
  const mailboxes = await RunMailboxes.open(db, userId, deps.mail, {
    loginRetries: {
      times: LOGIN_RETRIES,
      wait: () => deps.sleep(LOGIN_RETRY_WAIT_MS),
    },
  });
  try {
    let agent: ReportAgentResult | null = null;
    if (deps.models && mailboxes.accounts.length > 0) {
      agent = await runReportAgent(
        { db, userId, endsAt, now: deps.now },
        {
          models: deps.models,
          mailboxes,
          calendars: await RunCalendars.open(db, userId, {
            calendarConnector: deps.calendarConnector,
            auth: deps.mail.auth,
          }),
          openTodos: await readOpenTodos({ db, userId }),
          locale: settings.locale,
          timeZone: settings.timeZone,
          today: localDate,
          reportHour: settings.digestHour,
          mailWindow,
          mailStart: (accountId) => {
            const missedDay = firstMailDay(accountId, recentReports);
            // An old report covers all of its local day, and the stored
            // content does not show the type of report. Thus, start at local
            // midnight. A few hours of mail can show again, but no mail is lost.
            return missedDay
              ? localDayBounds(missedDay, settings.timeZone).start
              : mailWindow.start;
          },
        },
      );
    }
    const report = agent?.report ?? null;
    const status: MorningReportContentV2["status"] = report
      ? "written"
      : deps.models
        ? "failed"
        : "no-model";
    if (status !== "written" && !lastTry) return "retry";

    const opened = new Set(mailboxes.accounts.map((account) => account.id));
    const changes = report ? agent?.todoChanges : undefined;
    const content: MorningReportContentV2 = {
      version: 2,
      mailDate: addDays(localDate, -1),
      status,
      headline: report?.headline ?? null,
      needsAction: report?.needsAction ?? [],
      worthKnowing: report?.worthKnowing ?? [],
      rest: report?.rest ?? null,
      agenda: report?.agenda ?? null,
      mailCount: agent?.mailCount ?? 0,
      ranOutOfTime: agent?.run.forcedFinish ?? false,
      unreadMailboxes: plan.accounts
        .filter((account) => !opened.has(account.id))
        .map((account) => ({
          accountId: account.id,
          address: account.address,
        })),
      doneTodos: changes?.done ?? [],
    };

    const stored = await db.transaction(async (tx) => {
      const row = (
        await tx
          .insert(morningReports)
          .values({
            userId,
            localDate,
            content,
            modelId: report ? (deps.models?.agent.id ?? null) : null,
            builtAt,
          })
          .onConflictDoNothing({
            target: [morningReports.userId, morningReports.localDate],
          })
          .returning({ id: morningReports.id })
      ).at(0);
      if (!row) return null;
      if (changes) {
        await applyTodoChanges(tx, {
          userId,
          reportId: row.id,
          now: builtAt,
          changes,
        });
      }
      return row;
    });
    if (!stored) return null;
    const markedRead =
      report && agent
        ? await agent.markWindowMailRead(
            `In the morning report of ${localDate}`,
          )
        : 0;
    return {
      id: stored.id,
      localDate,
      locale: settings.locale,
      status,
      headline: content.headline,
      newTodos: changes?.added.length ?? 0,
      markedRead,
    };
  } finally {
    await mailboxes.finish();
  }
}
