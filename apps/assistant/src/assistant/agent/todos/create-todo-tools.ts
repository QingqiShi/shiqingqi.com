import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import type { MailSource } from "#src/assistant/report/types.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";

/** The limits of one run, against a run that a mail talks into mass changes. */
export const TODO_TOOL_LIMITS = { adds: 20, changes: 30 };

const MAX_TITLE_CHARS = 120;
const MAX_TEXT_CHARS = 400;

export interface StoredTodo {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
}

interface NewTodo {
  /** Made up front, so that the report can name the to-do before it is stored. */
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  source: MailSource | null;
}

type TodoEdit = Partial<Pick<StoredTodo, "title" | "detail" | "dueDate">>;

/** What a run wants to change in the to-do list: nothing is written until the report is stored. */
export interface TodoChanges {
  added: NewTodo[];
  done: { id: string; title: string; reason: string }[];
  updated: { id: string; edit: TodoEdit }[];
}

/** The user's open to-dos, oldest first. */
export function readOpenTodos({
  db,
  userId,
}: UserScope): Promise<StoredTodo[]> {
  return db
    .select({
      id: todos.id,
      title: todos.title,
      detail: todos.detail,
      dueDate: todos.dueDate,
    })
    .from(todos)
    .where(and(eq(todos.userId, userId), isNull(todos.doneAt)))
    .orderBy(asc(todos.createdAt), asc(todos.title));
}

function sameMail(a: MailSource, b: MailSource) {
  return a.accountId === b.accountId && a.messageId === b.messageId;
}

function normal(title: string) {
  return title.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

const todoKey = z
  .string()
  .describe('A to-do id from list_todos or add_todo, such as "t2".');
const title = z.string().trim().min(1).max(MAX_TITLE_CHARS);
const detail = z.string().trim().max(MAX_TEXT_CHARS);
const dueDate = z.iso.date().describe("YYYY-MM-DD.");

/**
 * The to-do tools of a run. They know only the open to-dos the run was
 * given, by short ids such as `t2`, and keep each change in memory;
 * `applyTodoChanges` writes them with the report.
 */
export function createTodoTools({
  openTodos,
  sourceOf,
  limits = TODO_TOOL_LIMITS,
}: {
  /** The user's own open to-dos. */
  openTodos: readonly StoredTodo[];
  /** The mail of a run id such as `m12`; a refusal for an id the run does not know. */
  sourceOf: (mailId: string) => MailSource;
  limits?: typeof TODO_TOOL_LIMITS;
}): {
  tools: AgentTools;
  changes: TodoChanges;
  /** The id of an open to-do of the run, by its key such as `t2`; null for any other key. */
  idOf: (key: string) => string | null;
  /** Whether the run closed a to-do because of this mail. */
  closedBy: (source: MailSource) => boolean;
} {
  type Entry =
    | { kind: "stored"; todo: StoredTodo; done: boolean }
    | { kind: "new"; todo: NewTodo; done: boolean };
  const entries = new Map<string, Entry>(
    openTodos.map((todo, index) => [
      `t${String(index + 1)}`,
      { kind: "stored", todo: { ...todo }, done: false },
    ]),
  );
  const changes: TodoChanges = { added: [], done: [], updated: [] };
  const closingMail: MailSource[] = [];
  let changeCount = 0;

  function open(key: string) {
    const entry = entries.get(key);
    if (!entry) {
      throw new ToolRefusal(
        `Unknown to-do "${key}". Use an id that list_todos gives.`,
      );
    }
    if (entry.done) throw new ToolRefusal(`To-do ${key} is done already.`);
    return entry;
  }

  function takeChange() {
    if (changeCount >= limits.changes) {
      throw new ToolRefusal(
        `This run has changed ${String(changeCount)} to-dos, the most it may.`,
      );
    }
    changeCount += 1;
  }

  function view(key: string, entry: Entry) {
    return {
      todo: key,
      title: entry.todo.title,
      detail: entry.todo.detail,
      dueDate: entry.todo.dueDate,
    };
  }

  const tools: AgentTools = {
    list_todos: agentTool({
      description: "The owner's open to-dos.",
      inputSchema: z.object({}),
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
        mail: z
          .string()
          .optional()
          .describe('The id of the mail it comes from, such as "m12".'),
      }),
      execute: (input) => {
        if (changes.added.length >= limits.adds) {
          throw new ToolRefusal(
            `This run has added ${String(limits.adds)} to-dos, the most it may.`,
          );
        }
        const same = [...entries].find(
          ([, entry]) =>
            !entry.done && normal(entry.todo.title) === normal(input.title),
        );
        if (same) {
          throw new ToolRefusal(
            `To-do ${same[0]} has that title already. Update it instead.`,
          );
        }
        const todo: NewTodo = {
          id: randomUUID(),
          title: input.title,
          detail: input.detail || null,
          dueDate: input.dueDate ?? null,
          source: input.mail === undefined ? null : sourceOf(input.mail),
        };
        changes.added.push(todo);
        const key = `t${String(entries.size + 1)}`;
        entries.set(key, { kind: "new", todo, done: false });
        return Promise.resolve({ todo: key });
      },
    }),

    complete_todo: agentTool({
      description:
        "Marks an open to-do done, when mail shows that it is done or no longer needed. The report shows the owner the to-do with the reason, so it needs no other line on it.",
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
      execute: ({ todo: key, reason, mail }) => {
        const entry = open(key);
        const source = mail === undefined ? null : sourceOf(mail);
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
          });
        }
        return Promise.resolve({ done: key });
      },
    }),

    update_todo: agentTool({
      description:
        "Changes an open to-do when mail changes it, such as a new due date. null clears detail or dueDate.",
      inputSchema: z.object({
        todo: todoKey,
        title: title.optional(),
        detail: detail.nullable().optional(),
        dueDate: dueDate.nullable().optional(),
      }),
      execute: ({ todo: key, ...input }) => {
        const entry = open(key);
        const edit: TodoEdit = {};
        if (input.title !== undefined) edit.title = input.title;
        if (input.detail !== undefined) edit.detail = input.detail || null;
        if (input.dueDate !== undefined) edit.dueDate = input.dueDate;
        if (Object.keys(edit).length === 0) {
          throw new ToolRefusal("Give at least one field to change.");
        }
        takeChange();
        Object.assign(entry.todo, edit);
        if (entry.kind === "stored") {
          changes.updated.push({ id: entry.todo.id, edit });
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

/**
 * Writes the changes of a run in the transaction that stores its report.
 * Every write names the user, and a change reaches only a to-do that is
 * still open, so one the owner ticked off during the run stays as it is.
 */
export async function applyTodoChanges(
  tx: Pick<AssistantDb, "insert" | "update">,
  {
    userId,
    reportId,
    now,
    changes,
  }: { userId: string; reportId: string; now: Date; changes: TodoChanges },
) {
  if (changes.added.length > 0) {
    await tx.insert(todos).values(
      changes.added.map((todo) => ({
        id: todo.id,
        userId,
        title: todo.title,
        detail: todo.detail,
        dueDate: todo.dueDate,
        sourceAccountId: todo.source?.accountId ?? null,
        sourceMessageId: todo.source?.messageId ?? null,
        createdReportId: reportId,
        createdAt: now,
      })),
    );
  }
  const stillOpen = (id: string) =>
    and(eq(todos.userId, userId), eq(todos.id, id), isNull(todos.doneAt));
  for (const { id, edit } of changes.updated) {
    await tx.update(todos).set(edit).where(stillOpen(id));
  }
  for (const { id } of changes.done) {
    await tx.update(todos).set({ doneAt: now }).where(stillOpen(id));
  }
}
