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
  type StoredTodo,
  type TodoChanges,
} from "#src/assistant/agent/todos/create-todo-tools.ts";
import type { AgentModels } from "#src/assistant/ai/get-agent-models.ts";
import type { UserLocale } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { isInDay, localDayBounds } from "./local-day-bounds.ts";
import { reportFolders } from "./report-folders.ts";
import {
  reportTask,
  type ReportFolder,
  type ReportMailbox,
} from "./report-task.ts";
import type { AgendaItem, MailSource, ReportItem } from "./types.ts";

/** Enough steps to list and read a busy day; the time usually ends a run first. */
const MAX_STEPS = 40;
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
  /** The mails of the day in the folders the report covers, each Message-ID once. */
  mailCount: number;
  /** Marks read the mail of the day in the folders the report covers. Call it only once the report is stored. */
  markDayMailRead: (reason: string) => Promise<number>;
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

const eventsOutput = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      start: z.string(),
      end: z.string().nullable(),
      allDay: z.boolean(),
      timeZone: z.string().nullable(),
      endTimeZone: z.string().optional(),
      location: z.string().nullable(),
      cancelled: z.boolean(),
    }),
  ),
});
type ListedEvent = z.output<typeof eventsOutput>["events"][number];

/**
 * Lists the day's mail of one folder, which gives each mail its id, so
 * that `markDayMailRead` reaches it whether or not the agent lists it.
 * Null when the folder cannot be listed.
 */
async function countDayMail(
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

function timeOfDay(event: Pick<AgendaItem, "allDay" | "start">) {
  return event.allDay ? "" : event.start.slice(11);
}

/**
 * Runs the report agent over mailboxes and calendars that are open: it
 * lists and reads the day's mail, looks at today's calendar, changes the
 * to-dos in memory and submits the report. Before the run, code lists the
 * day's mail of every folder the report covers, so the prompt can say how
 * much each holds and `markDayMailRead` reaches all of it. Nothing is
 * stored here, and no mail changes until `markDayMailRead`.
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
    locale,
    timeZone,
    today,
    mailDate,
  }: {
    models: AgentModels;
    mailboxes: RunMailboxes;
    calendars: RunCalendars;
    openTodos: readonly StoredTodo[];
    locale: UserLocale;
    timeZone: string;
    today: string;
    mailDate: string;
  },
): Promise<ReportAgentResult> {
  const handles = new MailHandles();
  const day = localDayBounds(mailDate, timeZone);
  const events = new Map<string, ListedEvent>();
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
  const todo = createTodoTools({ openTodos, sourceOf });

  const list = (input: ListMailInput) =>
    listMail({ mailboxes, handles, timeZone }, input);
  const mailboxList: ReportMailbox[] = [];
  for (const account of mailboxes.accounts) {
    const paths = await mailboxes.use(account.key, (mailbox) =>
      Promise.resolve(reportFolders(account.provider, mailbox.folders)),
    );
    const folders: ReportFolder[] = [];
    for (const path of paths) {
      folders.push({
        path,
        count: await countDayMail(list, {
          account: account.key,
          folder: path,
          since: mailDate,
          before: today,
        }),
      });
    }
    mailboxList.push({
      account: account.key,
      address: account.address,
      folders,
    });
  }

  const submit = agentTool({
    description:
      "Delivers the morning report and ends the run. A line about a mail names its id, so that the owner can open the mail.",
    loadUpFront: true,
    inputSchema: z.object({
      headline: line.describe(
        "The one thing the owner should know first, in one sentence: the push notification shows it.",
      ),
      needsAction: z
        .array(actionItem)
        .max(MAX_ITEMS)
        .describe("What the owner has to act on, most urgent first."),
      worthKnowing: z
        .array(item)
        .max(MAX_ITEMS)
        .describe(
          "What else the owner should know: not what the agenda, needsAction or a to-do, open or closed, says already.",
        ),
      agenda: z
        .array(
          z.object({
            event: z
              .string()
              .describe('An event id from list_events, such as "e3".'),
            note: line
              .optional()
              .describe(
                "Only what the mail changes or adds to the event; the report says it here alone.",
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
          "One line on the rest of the mail; empty when there is none.",
        ),
    }),
    execute: (input) => {
      const items = (list: typeof input.worthKnowing) =>
        list.map((entry) => ({
          text: entry.text,
          source: sourceOrNull(entry.mail),
        }));
      const agenda = calendars.hasAccounts
        ? (input.agenda ?? []).flatMap(({ event, note }): AgendaItem[] => {
            const found = events.get(event);
            if (!found || found.cancelled) return [];
            return [
              {
                title: found.title,
                allDay: found.allDay,
                start: found.start,
                end: found.endTimeZone ? null : found.end,
                timeZone:
                  found.timeZone && found.timeZone !== timeZone
                    ? found.timeZone
                    : null,
                location: found.location,
                note: note ?? null,
              },
            ];
          })
        : null;
      agenda?.sort(
        (a, b) =>
          Number(b.allDay) - Number(a.allDay) ||
          timeOfDay(a).localeCompare(timeOfDay(b)),
      );
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
      task: "report",
      instructions: reportTask.instructions({
        locale,
        timeZone,
        calendar: calendars.hasAccounts,
      }),
      prompt: reportTask.prompt({
        today,
        mailDate,
        mailboxes: mailboxList,
        openTodos,
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
          [SUBMIT]: submit,
        };
        if (!calendars.hasAccounts) return tools;
        const calendar = createCalendarTools({
          calendars,
          handles: new EventHandles(),
          timeZone,
          run: context,
          now,
        });
        const listEvents = calendar.tools.list_events;
        tools.list_calendars = upFront(calendar.tools.list_calendars, false);
        tools.list_events = {
          ...listEvents,
          loadUpFront: true,
          execute: async (input) => {
            const output = await listEvents.execute(input);
            for (const event of eventsOutput.safeParse(output).data?.events ??
              []) {
              events.set(event.id, event);
            }
            return output;
          },
        };
        return tools;
      },
    },
  );

  const dayMail = handles
    .listed()
    .filter(([, ref]) => isInDay(ref.receivedAt, day));
  return {
    run,
    report: submitted,
    todoChanges: todo.changes,
    mailCount: new Set(dayMail.map(([, ref]) => ref.messageId)).size,
    markDayMailRead: async (reason) => {
      if (!markRead) return 0;
      const ids = dayMail.map(([id]) => id);
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
