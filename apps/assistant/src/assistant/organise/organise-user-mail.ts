import { eq } from "drizzle-orm";
import {
  createCalendarTools,
  type CalendarToolStats,
  type SourceMail,
} from "#src/assistant/agent/calendar/create-calendar-tools.ts";
import { EventHandles } from "#src/assistant/agent/calendar/event-handles.ts";
import { RunCalendars } from "#src/assistant/agent/calendar/run-calendars.ts";
import {
  createMailTools,
  type MailToolStats,
} from "#src/assistant/agent/mail/create-mail-tools.ts";
import { isInbox } from "#src/assistant/agent/mail/destination-refusal.ts";
import { MailHandles } from "#src/assistant/agent/mail/mail-handles.ts";
import { RunMailboxes } from "#src/assistant/agent/mail/run-mailboxes.ts";
import {
  runAgent,
  type AgentRunResult,
} from "#src/assistant/agent/run-agent.ts";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import type { CalendarConnector } from "#src/assistant/calendar/caldav/types.ts";
import { DEFAULT_TIME_ZONE, userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import type { MailboxDeps } from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { openMailHref } from "#src/assistant/report/open-mail-href.ts";
import { organiseTask, type InboxState } from "./organise-task.ts";

/**
 * The mail tools of the organise agent: all but mark_read, because the owner
 * wants mail to stay unread until the morning report.
 */
function organiseTools({
  mark_read: _markRead,
  ...tools
}: ReturnType<typeof createMailTools>["tools"]) {
  return tools;
}

/** Enough steps for a full inbox of a few hundred mails; the time budget usually ends a run first. */
const MAX_STEPS = 60;

export interface OrganiseDeps extends MailboxDeps {
  calendarConnector: CalendarConnector;
  agent: AssistantModel;
  reader: AssistantModel;
}

export interface OrganiseUserResult extends MailToolStats, CalendarToolStats {
  /** False when the user has not turned organising on: no mailbox was opened. */
  enabled: boolean;
  accounts: number;
  failedAccounts: number;
  /** The mail in the inboxes when the run started. */
  inboxMail: number;
  /** Null when no inbox held mail, so no model ran. */
  run: Pick<AgentRunResult, "status" | "steps"> | null;
}

/**
 * Runs the organise agent over a user's mailboxes, while the user has
 * organising on. It opens each account first and calls no model when no
 * inbox holds mail. With an iCloud account, the agent also gets the
 * calendar tools, which log in only when the agent first uses them.
 */
export async function organiseUserMail(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: OrganiseDeps,
): Promise<OrganiseUserResult> {
  const result: OrganiseUserResult = {
    enabled: false,
    accounts: 0,
    failedAccounts: 0,
    inboxMail: 0,
    run: null,
    createdFolders: 0,
    renamedFolders: 0,
    deletedFolders: 0,
    moved: 0,
    markedRead: 0,
    markedUnread: 0,
    flagged: 0,
    unflagged: 0,
    createdEvents: 0,
    updatedEvents: 0,
    deletedEvents: 0,
  };
  const settings = (
    await db
      .select({
        enabled: userSettings.organiseEnabled,
        notes: userSettings.organiseNotes,
        locale: userSettings.locale,
        timeZone: userSettings.timeZone,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
  ).at(0);
  if (!settings?.enabled) return result;
  result.enabled = true;

  const mailboxes = await RunMailboxes.open(db, userId, deps);
  result.failedAccounts = mailboxes.failedAccounts;
  try {
    const inboxes: InboxState[] = [];
    for (const account of mailboxes.accounts) {
      const state = await mailboxes
        .use(account.key, async (mailbox) => {
          const inbox = mailbox.folders.find(isInbox);
          if (!inbox) return null;
          await mailbox.select(inbox.path, false);
          const all = await mailbox.session.searchUids({});
          const unread = await mailbox.session.searchUids({ seen: false });
          return {
            account: account.key,
            address: account.address,
            inbox: inbox.path,
            total: all.length,
            unread: unread.length,
          };
        })
        .catch(() => null);
      if (state) inboxes.push(state);
    }
    result.inboxMail = inboxes.reduce((sum, inbox) => sum + inbox.total, 0);
    if (result.inboxMail === 0) return result;

    const handles = new MailHandles();
    const calendars = await RunCalendars.open(db, userId, {
      calendarConnector: deps.calendarConnector,
      auth: deps.auth,
    });
    const timeZone = settings.timeZone || DEFAULT_TIME_ZONE;
    const sourceMail = (id: string): SourceMail => {
      const ref = handles.get(id);
      const account = mailboxes.accounts.find(
        (entry) => entry.key === ref.accountKey,
      );
      return {
        messageId: ref.messageId,
        subject: ref.subject,
        sender: ref.sender,
        href: account
          ? openMailHref({
              provider: account.provider,
              accountAddress: account.address,
              messageId: ref.messageId,
            })
          : null,
      };
    };
    const made: { stats: (MailToolStats | CalendarToolStats)[] } = {
      stats: [],
    };
    const run = await runAgent(
      { db, userId, model: deps.agent, endsAt, now: deps.auth.now },
      {
        task: "organise",
        instructions: organiseTask.instructions({
          ...settings,
          calendar: calendars.hasAccounts,
        }),
        prompt: organiseTask.prompt(
          inboxes.filter((inbox) => inbox.total > 0),
          deps.auth.now(),
        ),
        maxSteps: MAX_STEPS,
        tools: (context) => {
          const mail = createMailTools({
            mailboxes,
            handles,
            reader: deps.reader,
            run: context,
          });
          made.stats.push(mail.stats);
          const tools = organiseTools(mail.tools);
          if (!calendars.hasAccounts) return tools;
          const calendar = createCalendarTools({
            calendars,
            handles: new EventHandles(),
            timeZone,
            sourceMail,
            run: context,
            now: deps.auth.now,
          });
          made.stats.push(calendar.stats);
          return { ...tools, ...calendar.tools };
        },
      },
    );
    result.run = { status: run.status, steps: run.steps };
    for (const stats of made.stats) Object.assign(result, stats);
    return result;
  } finally {
    result.accounts = mailboxes.accounts.length + mailboxes.failedAccounts;
    await mailboxes.finish();
    console.info("Inbox organised", {
      accounts: result.accounts,
      failedAccounts: result.failedAccounts,
      inboxMail: result.inboxMail,
      run: result.run,
      moved: result.moved,
      createdFolders: result.createdFolders,
      renamedFolders: result.renamedFolders,
      deletedFolders: result.deletedFolders,
      createdEvents: result.createdEvents,
      updatedEvents: result.updatedEvents,
      deletedEvents: result.deletedEvents,
    });
  }
}
