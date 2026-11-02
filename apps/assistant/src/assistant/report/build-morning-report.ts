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
import { addDays } from "./local-day-bounds.ts";
import { readReportSettings } from "./read-report-settings.ts";
import { runReportAgent, type ReportAgentResult } from "./run-report-agent.ts";
import type { MorningReportContentV2 } from "./types.ts";

/**
 * From this local hour on, a run that cannot write the report stores one
 * that says so. Before it, the run stores nothing and the next hour tries again.
 */
const LAST_TRY_HOUR = 23;

export interface ReportBuildDeps {
  /** Null when no API key is set: then the runs try again until the last try of the day. */
  models: AgentModels | null;
  mail: MailboxDeps;
  calendarConnector: CalendarConnector;
  now: () => Date;
}

export interface BuiltReport {
  id: string;
  localDate: string;
  locale: UserLocale;
  status: MorningReportContentV2["status"];
  headline: string | null;
  newTodos: number;
  /** The mails of the day marked read once the report was stored. */
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
  return { accounts, settings, localDate };
}

/**
 * Builds the user's morning report when one is due (see `dueReportDate`):
 * the report agent reads the mail of the day before and today's calendar,
 * and submits the report; the report and the agent's to-do changes are
 * stored in one transaction. Only then is the day's mail that the agent
 * listed marked read. Returns null when none is due, the user has no
 * mailbox, or another run stored the day first. Returns "retry" and stores
 * nothing when no mailbox can be read or the agent submits no report,
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

  const { settings, localDate } = plan;
  const lastTry = localClock(builtAt, settings.timeZone).hour >= LAST_TRY_HOUR;
  if (!deps.models && !lastTry) return "retry";
  const mailDate = addDays(localDate, -1);
  const mailboxes = await RunMailboxes.open(db, userId, deps.mail);
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
          mailDate,
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
      mailDate,
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
        ? await agent.markDayMailRead(`In the morning report of ${localDate}`)
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
