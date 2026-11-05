import { randomUUID } from "node:crypto";
import { z } from "zod";
import { datesInOrder } from "#src/assistant/report/dates-in-order.ts";
import type { MailSource } from "#src/assistant/report/types.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import { createTodoEntries } from "./create-todo-entries.ts";
import {
  deletedTodoToBringBack,
  normal,
  refuseRejected,
  sameMail,
} from "./deleted-todo-to-bring-back.ts";
import type {
  DeletedTodo,
  NewTodo,
  RejectedTodo,
  StoredTodo,
  TodoChanges,
  TodoEdit,
} from "./types.ts";

/** The limits of one run, against a run that a mail talks into mass changes. */
export const TODO_TOOL_LIMITS = { adds: 20, changes: 30 };

const MAX_TITLE_CHARS = 120;
const MAX_TEXT_CHARS = 400;

const todoKey = z
  .string()
  .describe('A to-do id from list_todos or add_todo, such as "t2".');
const title = z.string().trim().min(1).max(MAX_TITLE_CHARS);
const detail = z.string().trim().max(MAX_TEXT_CHARS);
const dueDate = z.iso.date().describe("YYYY-MM-DD.");
const startDate = z.iso
  .date()
  .describe(
    "YYYY-MM-DD, not after dueDate. The day the to-do joins the owner's list for today, for when a mail says when to act.",
  );
const reason = z.string().trim().min(1).max(MAX_TEXT_CHARS);
const mailId = z.string().describe('The id of the mail, such as "m12".');
const changeReason = reason.describe(
  "Why, in one line. The owner's activity page shows it.",
);

/**
 * The to-do tools of a run. They know only the open to-dos the run was
 * given, by short ids such as `t2`, and the to-dos the owner deleted, by ids
 * such as `d2`, and keep each change in memory; `applyTodoChanges` writes
 * them with the report.
 */
export function createTodoTools({
  openTodos,
  deletedTodos,
  rejectedTodos,
  sourceOf,
  receivedAtOf,
  limits = TODO_TOOL_LIMITS,
}: {
  /** The user's own open to-dos. */
  openTodos: readonly StoredTodo[];
  /** The to-dos the user deleted lately. */
  deletedTodos: readonly DeletedTodo[];
  /** The to-dos the user said should not have been added. */
  rejectedTodos: readonly RejectedTodo[];
  /** The mail of a run id such as `m12`; a refusal for an id the run does not know. */
  sourceOf: (mailId: string) => MailSource;
  /** When the mail of a run id came. */
  receivedAtOf: (mailId: string) => Date;
  limits?: typeof TODO_TOOL_LIMITS;
}): {
  tools: AgentTools;
  changes: TodoChanges;
  /** The id of an open to-do of the run, by its key such as `t2`; null for any other key. */
  idOf: (key: string) => string | null;
  /** Whether the run closed a to-do because of this mail. */
  closedBy: (source: MailSource) => boolean;
} {
  const {
    entries,
    open,
    takeChange,
    ownerSet,
    repeatOf,
    waitingSinceOf,
    replyTime,
    view,
  } = createTodoEntries({ openTodos, limits, receivedAtOf });
  const deleted = new Map(
    deletedTodos.map((todo, index) => [`d${String(index + 1)}`, todo]),
  );
  const waiting: NonNullable<TodoChanges["waiting"]> = [];
  const replied: NonNullable<TodoChanges["replied"]> = [];
  const changes: TodoChanges = {
    added: [],
    done: [],
    updated: [],
    waiting,
    replied,
  };
  const closingMail: MailSource[] = [];

  const tools: AgentTools = {
    list_todos: agentTool({
      description:
        "The owner's open to-dos. ownerSet names the fields the owner set, which you cannot change. waitingOn says who or what a to-do waits on, since waitingSince. repeats says how a to-do comes back when it is closed, which only the owner decides. checklist is the owner's steps and which are ticked, which you cannot change. Ticking every step does not close a to-do.",
      inputSchema: z.object({}),
      describe: () => ({ kind: "list_todos" }),
      execute: () =>
        Promise.resolve({
          todos: [...entries]
            .filter(([, entry]) => !entry.done)
            .map(([key, entry]) => view(key, entry)),
        }),
    }),

    add_todo: agentTool({
      description: `Adds a to-do for something the owner has to do. At most ${String(limits.adds)} per run.`,
      inputSchema: z.object({
        title: title.describe("A short imperative."),
        detail: detail
          .optional()
          .describe("One line of context: who asked, an amount, a reference."),
        dueDate: dueDate.optional(),
        startDate: startDate.optional(),
        mail: z
          .string()
          .optional()
          .describe('The id of the mail it comes from, such as "m12".'),
        deletedTodo: z
          .string()
          .optional()
          .describe(
            'The to-do the owner deleted that this is the same matter as, such as "d2". It needs a new mail.',
          ),
        reason: changeReason,
      }),
      describe: ({ title }) => ({ kind: "add_todo", title }),
      execute: (input) => {
        if (changes.added.length >= limits.adds) {
          throw new ToolRefusal(
            `This run has added ${String(limits.adds)} to-dos, the most it may.`,
          );
        }
        if (
          !datesInOrder({
            startDate: input.startDate ?? null,
            dueDate: input.dueDate ?? null,
          })
        ) {
          throw new ToolRefusal("startDate cannot be after dueDate.");
        }
        const same = [...entries].find(
          ([, entry]) =>
            (!entry.done || repeatOf(entry)) &&
            normal(entry.todo.title) === normal(input.title),
        );
        if (same) {
          throw new ToolRefusal(
            same[1].done
              ? `To-do ${same[0]} has that title and repeats, so its next occurrence comes by itself.`
              : `To-do ${same[0]} has that title already. Update it instead.`,
          );
        }
        const mail =
          input.mail === undefined
            ? null
            : {
                source: sourceOf(input.mail),
                receivedAt: receivedAtOf(input.mail),
              };
        refuseRejected(rejectedTodos, input.title, mail?.source ?? null);
        const reAddsTodoId = deletedTodoToBringBack(deleted, input, mail);
        const todo: NewTodo = {
          id: randomUUID(),
          title: input.title,
          detail: input.detail || null,
          dueDate: input.dueDate ?? null,
          startDate: input.startDate ?? null,
          source: mail?.source ?? null,
          reAddsTodoId,
          reason: input.reason,
        };
        changes.added.push(todo);
        const key = `t${String(entries.size + 1)}`;
        entries.set(key, { kind: "new", todo, done: false });
        return Promise.resolve({ todo: key });
      },
    }),

    complete_todo: agentTool({
      description:
        "Marks an open to-do done, when mail shows that it is done or no longer needed. The report shows the owner the to-do with the reason, so it needs no other line on it. On a repeating to-do it closes this occurrence only: the next comes by itself, and only the owner can end the series. A to-do that waits closes only with a mail that came after the wait began.",
      inputSchema: z.object({
        todo: todoKey,
        reason: z
          .string()
          .trim()
          .min(1)
          .max(MAX_TEXT_CHARS)
          .describe("What in the mail shows it, in one line."),
        mail: z
          .string()
          .optional()
          .describe('The id of the mail that shows it, such as "m12".'),
      }),
      describe: ({ todo: key }) => ({
        kind: "complete_todo",
        title: open(key).todo.title,
      }),
      execute: ({ todo: key, reason, mail }) => {
        const entry = open(key);
        const source = mail === undefined ? null : sourceOf(mail);
        if (waitingSinceOf(entry) && mail === undefined) {
          throw new ToolRefusal(
            `To-do ${key} waits, so give the mail that shows the reply came.`,
          );
        }
        const mailAt =
          mail === undefined ? undefined : replyTime(key, entry, mail);
        takeChange();
        if (source) closingMail.push(source);
        entry.done = true;
        if (entry.kind === "new") {
          changes.added = changes.added.filter((todo) => todo !== entry.todo);
        } else {
          changes.done.push({
            id: entry.todo.id,
            title: entry.todo.title,
            reason,
            repeats: entry.todo.repeat !== null,
            mailAt: mailAt?.toISOString(),
          });
        }
        return Promise.resolve({ done: key });
      },
    }),

    update_todo: agentTool({
      description:
        "Changes an open to-do when mail changes it, such as a new due date. null clears detail, dueDate or startDate. The fields the owner set cannot change.",
      inputSchema: z.object({
        todo: todoKey,
        title: title.optional(),
        detail: detail.nullable().optional(),
        dueDate: dueDate.nullable().optional(),
        startDate: startDate.nullable().optional(),
        reason: changeReason,
      }),
      describe: ({ todo: key, title: newTitle }) => {
        const { title: oldTitle } = open(key).todo;
        return { kind: "update_todo", title: newTitle ?? oldTitle };
      },
      execute: ({ todo: key, reason, ...input }) => {
        const entry = open(key);
        const edit: TodoEdit = {};
        if (input.title !== undefined) edit.title = input.title;
        if (input.detail !== undefined) edit.detail = input.detail || null;
        if (input.dueDate !== undefined) edit.dueDate = input.dueDate;
        if (input.startDate !== undefined) edit.startDate = input.startDate;
        if (Object.keys(edit).length === 0) {
          throw new ToolRefusal("Give at least one field to change.");
        }
        const refused = ownerSet(entry).filter((field) => field in edit);
        if (refused.length > 0) {
          throw new ToolRefusal(
            `The owner set ${refused.join(" and ")} of to-do ${key}, so leave it as it is. If the mail conflicts with it, say so in the report instead.`,
          );
        }
        if (!datesInOrder({ ...entry.todo, ...edit })) {
          throw new ToolRefusal(
            `That would start to-do ${key} after its due date. Change both dates, or if the owner set one and the mail conflicts with it, say so in the report instead.`,
          );
        }
        takeChange();
        Object.assign(entry.todo, edit);
        if (entry.kind === "stored") {
          changes.updated.push({ id: entry.todo.id, edit, reason });
        }
        return Promise.resolve(view(key, entry));
      },
    }),

    mark_waiting: agentTool({
      description:
        "Marks an open to-do as waiting, when a mail shows that the owner waits for someone's reply. It leaves the owner's list for today until followUpDate. The report shows the owner the to-do with the reason, so it needs no other line on it. The owner's choice stands: you cannot change a wait that the owner set or ended.",
      inputSchema: z.object({
        todo: todoKey,
        waitingOn: z
          .string()
          .trim()
          .min(1)
          .max(MAX_TITLE_CHARS)
          .describe("Who or what it waits on."),
        followUpDate: z.iso
          .date()
          .optional()
          .describe(
            "YYYY-MM-DD. The day it comes back to the owner's list for today, if no reply came.",
          ),
        mail: mailId.describe('The mail that shows it, such as "m12".'),
        reason: reason.describe("What in the mail shows it, in one line."),
      }),
      describe: ({ todo: key }) => ({
        kind: "mark_waiting",
        title: open(key).todo.title,
      }),
      execute: ({ todo: key, waitingOn, followUpDate, mail, reason }) => {
        const entry = open(key);
        const refused = ownerSet(entry).filter(
          (field) =>
            field === "waitingOn" ||
            (field === "followUpDate" && followUpDate !== undefined),
        );
        if (refused.length > 0) {
          throw new ToolRefusal(
            `The owner set ${refused.join(" and ")} of to-do ${key}, so leave it as it is. If the mail conflicts with it, say so in the report instead.`,
          );
        }
        const since = receivedAtOf(mail).toISOString();
        takeChange();
        if (entry.kind === "new") {
          Object.assign(entry.todo, {
            waitingOn,
            followUpDate,
            waitingSince: since,
            waitingNote: reason,
          });
        } else {
          Object.assign(entry.todo, {
            waitingOn,
            followUpDate: followUpDate ?? entry.todo.followUpDate,
            waitingSince: new Date(since),
          });
          waiting.push({
            id: entry.todo.id,
            waitingOn,
            followUpDate,
            since,
            reason,
          });
        }
        return Promise.resolve(view(key, entry));
      },
    }),

    reply_came: agentTool({
      description:
        "Moves a to-do that waits back to open, when a mail shows that the reply came and the owner has something to do. It may be a wait that the owner set. If the reply settles the matter, use complete_todo instead. When it needs the owner today, also give it a start date with update_todo. The report shows the owner the to-do with the reason, so it needs no other line on it.",
      inputSchema: z.object({
        todo: todoKey,
        mail: mailId.describe('The mail with the reply, such as "m12".'),
        reason: reason.describe(
          "What the reply says and what is left to do, in one line.",
        ),
      }),
      describe: ({ todo: key }) => ({
        kind: "reply_came",
        title: open(key).todo.title,
      }),
      execute: ({ todo: key, mail, reason }) => {
        const entry = open(key);
        if (!waitingSinceOf(entry)) {
          throw new ToolRefusal(`To-do ${key} does not wait.`);
        }
        const mailAt = replyTime(key, entry, mail).toISOString();
        takeChange();
        if (entry.kind === "new") {
          Object.assign(entry.todo, {
            waitingOn: undefined,
            followUpDate: undefined,
            waitingSince: undefined,
            waitingNote: reason,
          });
        } else {
          Object.assign(entry.todo, {
            waitingOn: null,
            followUpDate: null,
            waitingSince: null,
          });
          replied.push({ id: entry.todo.id, reason, mailAt });
        }
        return Promise.resolve(view(key, entry));
      },
    }),
  };
  return {
    tools,
    changes,
    idOf: (key) => {
      const entry = entries.get(key);
      return entry && !entry.done ? entry.todo.id : null;
    },
    closedBy: (source) => closingMail.some((entry) => sameMail(entry, source)),
  };
}
