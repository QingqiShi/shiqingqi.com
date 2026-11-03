import { z } from "zod";
import {
  agentTool,
  callAgentTool,
  ToolRefusal,
  type AgentTool,
  type AgentTools,
} from "#src/assistant/agent/agent-tool.ts";
import { createCalendarTools } from "#src/assistant/agent/calendar/create-calendar-tools.ts";
import { EventHandles } from "#src/assistant/agent/calendar/event-handles.ts";
import type { RunCalendars } from "#src/assistant/agent/calendar/run-calendars.ts";
import { sourceMailOf } from "#src/assistant/agent/calendar/source-mail-of.ts";
import {
  createMailTools,
  listMail,
  MAIL_TOOL_LIMITS,
  type ListMailInput,
} from "#src/assistant/agent/mail/create-mail-tools.ts";
import { MailHandles } from "#src/assistant/agent/mail/mail-handles.ts";
import type { RunMailboxes } from "#src/assistant/agent/mail/run-mailboxes.ts";
import {
  runAgent,
  type AgentRunResult,
} from "#src/assistant/agent/run-agent.ts";
import {
  createTodoTools,
  type DeletedTodo,
  type RejectedTodo,
  type StoredTodo,
  type TodoChanges,
} from "#src/assistant/agent/todos/create-todo-tools.ts";
import type { AgentModels } from "#src/assistant/ai/get-agent-models.ts";
import type { AgentTask, UserLocale } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { agendaItems } from "./agenda-items.ts";
import {
  isInBounds,
  wallClockLabels,
  type TimeBounds,
} from "./local-day-bounds.ts";
import { reportFolders } from "./report-folders.ts";
import {
  reportTask,
  type ReportFolder,
  type ReportMailbox,
} from "./report-task.ts";
import type { AgendaItem, MailSource, ReportItem } from "./types.ts";

/** Enough steps to list and read a busy day; the time usually ends a run first. */
const MAX_STEPS = 100;
const MAX_LINE_CHARS = 400;
const MAX_ITEMS = 30;
const SUBMIT = "submit_report";
const MARK_READ_BATCH = 100;
const LIST_PAGE = MAIL_TOOL_LIMITS.listPage;

export interface SubmittedReport {
  headline: string;
  needsAction: ReportItem[];
  worthKnowing: ReportItem[];
  rest: string | null;
  /** Null when the run had no calendar. */
  agenda: AgendaItem[] | null;
}

export interface ReportAgentResult {
  run: AgentRunResult;
  /** Null when the agent did not submit a report. */
  report: SubmittedReport | null;
  todoChanges: TodoChanges;
  calendarChanges: number;
  /** The mails of the window in the folders the report covers, each Message-ID once; no earlier mail that the report also covers. */
  mailCount: number;
  /** Marks read, per account, the listed mail from its `mailStart` up to the window's end, in the folders the report covers, and no other mail. Call it only once the report is stored. */
  markWindowMailRead: (reason: string) => Promise<number>;
}

const line = z.string().trim().min(1).max(MAX_LINE_CHARS);
const item = z.object({
  text: line,
  mail: z
    .string()
    .optional()
    .describe('The id of the mail it comes from, such as "m12".'),
});
const actionItem = item.extend({
  todo: z
    .string()
    .optional()
    .describe(
      'The to-do for this line, such as "t3": the page shows the to-do in its place.',
    ),
});

/**
 * Lists the mail the report covers in one folder, which gives each mail its
 * id, so that `markWindowMailRead` reaches it whether or not the agent lists it.
 * Null when the folder cannot be listed.
 */
async function countWindowMail(
  list: (input: ListMailInput) => ReturnType<typeof listMail>,
  input: ListMailInput,
): Promise<ReportFolder["count"]> {
  const count = { total: 0, unread: 0 };
  let cursor: string | undefined;
  try {
    do {
      const page = await list({ ...input, limit: LIST_PAGE, cursor });
      count.total += page.mails.length;
      count.unread += page.mails.filter((mail) => mail.unread).length;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  } catch (error) {
    console.error("Counting the report's mail failed", error);
    return null;
  }
  return count;
}

/** The tool with `loadUpFront` set as the report wants it. */
function upFront(tool: AgentTool, loadUpFront: boolean): AgentTool {
  return { ...tool, loadUpFront };
}

/**
 * Runs the report agent over mailboxes and calendars that are open: it
 * lists and reads the window's mail, looks at today's calendar, changes the
 * to-dos in memory and submits the report. It also changes the
 * calendar at once, with an action row for each change, unless the calendars
 * are read-only. Before the run, code lists the mail from each account's
 * `mailStart` up to the window's end in every folder the report covers, so the
 * prompt can say how much each holds and `markWindowMailRead` reaches all of it. No report or to-do is stored here,
 * and no mail changes until `markWindowMailRead`.
 */
export async function runReportAgent(
  {
    db,
    userId,
    endsAt,
    now,
  }: { db: AssistantDb; userId: string; endsAt: number; now: () => Date },
  {
    models,
    mailboxes,
    calendars,
    openTodos,
    deletedTodos,
    rejectedTodos,
    undoneTodoChanges,
    locale,
    timeZone,
    today,
    mailWindow,
    mailStart,
    task,
  }: {
    models: AgentModels;
    mailboxes: RunMailboxes;
    calendars: RunCalendars;
    openTodos: readonly StoredTodo[];
    deletedTodos: readonly DeletedTodo[];
    rejectedTodos: readonly RejectedTodo[];
    /** The agent's to-do changes that the owner undid, as lines. */
    undoneTodoChanges: readonly string[];
    locale: UserLocale;
    timeZone: string;
    today: string;
    mailWindow: TimeBounds;
    /** Where the account's mail starts: `mailWindow.start`, or earlier when an earlier report missed it. */
    mailStart: (accountId: string) => Date;
    /** What `agent_runs` calls this run. */
    task: Extract<AgentTask, "report" | "report-preview">;
  },
): Promise<ReportAgentResult> {
  const handles = new MailHandles();
  const made: { calendar: ReturnType<typeof createCalendarTools> | null } = {
    calendar: null,
  };
  let submitted: SubmittedReport | null = null;
  let markRead: AgentTool | null = null;

  const sourceOf = (id: string): MailSource => {
    const ref = handles.get(id);
    const account = mailboxes.accounts.find(
      (entry) => entry.key === ref.accountKey,
    );
    if (!account) throw new ToolRefusal(`Unknown mail id "${id}".`);
    return { accountId: account.id, messageId: ref.messageId };
  };
  const sourceOrNull = (id: string | undefined) => {
    if (id === undefined) return null;
    try {
      return sourceOf(id);
    } catch (error) {
      if (error instanceof ToolRefusal) return null;
      throw error;
    }
  };
  const todo = createTodoTools({
    openTodos,
    deletedTodos,
    rejectedTodos,
    sourceOf,
    receivedAtOf: (id) => handles.get(id).receivedAt,
  });

  const list = (input: ListMailInput) =>
    listMail({ mailboxes, handles, timeZone }, input);
  const mailboxList: ReportMailbox[] = [];
  const covered = new Map<string, TimeBounds>();
  for (const account of mailboxes.accounts) {
    const start = mailStart(account.id);
    covered.set(account.key, { start, end: mailWindow.end });
    const paths = await mailboxes.use(account.key, (mailbox) =>
      Promise.resolve(reportFolders(account.provider, mailbox.folders)),
    );
    const folders: ReportFolder[] = [];
    for (const path of paths) {
      folders.push({
        path,
        count: await countWindowMail(list, {
          account: account.key,
          folder: path,
          since: start.toISOString(),
          before: mailWindow.end.toISOString(),
        }),
      });
    }
    mailboxList.push({
      account: account.key,
      address: account.address,
      since: start < mailWindow.start ? start.toISOString() : null,
      folders,
    });
  }

  const submit = agentTool({
    description:
      "Submits the morning report and ends the run. Give the id of the mail a line is about, so that the owner can open it.",
    loadUpFront: true,
    inputSchema: z.object({
      headline: line.describe(
        "The most important thing for the owner to know, in one sentence. The push notification shows it.",
      ),
      needsAction: z
        .array(actionItem)
        .max(MAX_ITEMS)
        .describe("What the owner has to act on, most urgent first."),
      worthKnowing: z
        .array(item)
        .max(MAX_ITEMS)
        .describe(
          "Other things the owner should know. Leave out anything already in the agenda, needsAction or a to-do.",
        ),
      agenda: z
        .array(
          z.object({
            event: z
              .string()
              .describe(
                'An event id from list_events or create_event, such as "e3".',
              ),
            note: line
              .optional()
              .describe(
                "What a mail changes or adds to this event, if anything.",
              ),
          }),
        )
        .max(MAX_ITEMS)
        .optional()
        .describe("Today's events."),
      rest: z
        .string()
        .trim()
        .max(MAX_LINE_CHARS)
        .describe(
          "A one-line summary of the other mail you read, which the owner does not need to act on. Empty if there is none.",
        ),
    }),
    describe: () => ({ kind: "write_report" }),
    execute: (input) => {
      const items = (list: typeof input.worthKnowing) =>
        list.map((entry) => ({
          text: entry.text,
          source: sourceOrNull(entry.mail),
        }));
      const agenda = calendars.hasAccounts
        ? agendaItems(
            (input.agenda ?? []).flatMap(({ event, note }) => {
              const found = made.calendar?.view(event);
              return found && !found.cancelled ? [{ ...found, note }] : [];
            }),
            timeZone,
          )
        : null;
      submitted = {
        headline: input.headline,
        needsAction: input.needsAction.map((entry) => {
          const todoId =
            entry.todo === undefined ? null : todo.idOf(entry.todo);
          return {
            text: entry.text,
            source: sourceOrNull(entry.mail),
            ...(todoId ? { todoId } : {}),
          };
        }),
        worthKnowing: items(input.worthKnowing).filter(
          (entry) => !entry.source || !todo.closedBy(entry.source),
        ),
        rest: input.rest || null,
        agenda,
      };
      return Promise.resolve({ submitted: true });
    },
  });

  const run = await runAgent(
    { db, userId, model: models.agent, endsAt, now },
    {
      task,
      reasoning: "high",
      instructions: reportTask.instructions({
        locale,
        timeZone,
        calendar: calendars.hasAccounts,
      }),
      prompt: reportTask.prompt({
        today,
        windowLabels: wallClockLabels(mailWindow, timeZone),
        mailWindow,
        mailboxes: mailboxList,
        openTodos,
        deletedTodos,
        rejectedTodos,
        undoneTodoChanges,
        minutes: Math.max(1, Math.floor((endsAt - now().getTime()) / 60_000)),
      }),
      maxSteps: MAX_STEPS,
      finish: { tool: SUBMIT, done: () => submitted !== null },
      tools: (context) => {
        const mail = createMailTools({
          mailboxes,
          handles,
          reader: models.reader,
          run: context,
          timeZone,
        });
        markRead = mail.tools.mark_read;
        const tools: AgentTools = {
          list_accounts: upFront(mail.tools.list_accounts, false),
          list_folders: upFront(mail.tools.list_folders, false),
          list_mail: upFront(mail.tools.list_mail, true),
          read_mail: upFront(mail.tools.read_mail, true),
          list_todos: upFront(todo.tools.list_todos, false),
          add_todo: upFront(todo.tools.add_todo, true),
          complete_todo: upFront(todo.tools.complete_todo, true),
          update_todo: upFront(todo.tools.update_todo, false),
          mark_waiting: upFront(todo.tools.mark_waiting, false),
          reply_came: upFront(todo.tools.reply_came, false),
          [SUBMIT]: submit,
        };
        if (!calendars.hasAccounts) return tools;
        const calendar = createCalendarTools({
          calendars,
          handles: new EventHandles(),
          timeZone,
          sourceMail: (id) => sourceMailOf(mailboxes, handles, id),
          run: context,
          now,
        });
        made.calendar = calendar;
        tools.list_calendars = upFront(calendar.tools.list_calendars, false);
        tools.list_events = upFront(calendar.tools.list_events, true);
        tools.create_event = upFront(calendar.tools.create_event, true);
        tools.update_event = upFront(calendar.tools.update_event, true);
        tools.delete_event = upFront(calendar.tools.delete_event, false);
        return tools;
      },
    },
  );

  const listed = handles.listed();
  const windowMail = listed.filter(([, ref]) =>
    isInBounds(ref.receivedAt, mailWindow),
  );
  const coveredMail = listed.filter(([, ref]) => {
    const bounds = covered.get(ref.accountKey);
    return bounds !== undefined && isInBounds(ref.receivedAt, bounds);
  });
  return {
    run,
    report: submitted,
    todoChanges: todo.changes,
    calendarChanges: made.calendar
      ? made.calendar.stats.createdEvents +
        made.calendar.stats.updatedEvents +
        made.calendar.stats.deletedEvents
      : 0,
    mailCount: new Set(windowMail.map(([, ref]) => ref.messageId)).size,
    markWindowMailRead: async (reason) => {
      if (!markRead) return 0;
      const ids = coveredMail.map(([id]) => id);
      let changed = 0;
      for (let start = 0; start < ids.length; start += MARK_READ_BATCH) {
        const result = await callAgentTool(markRead, {
          ids: ids.slice(start, start + MARK_READ_BATCH),
          read: true,
          reason,
        });
        const done = z
          .object({ changed: z.array(z.string()) })
          .safeParse(result).data;
        if (done) changed += done.changed.length;
        else console.error("Marking the report's mail read failed", result);
      }
      return changed;
    },
  };
}
