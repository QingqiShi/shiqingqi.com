import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { z } from "zod";
import { todos, type TodoEditableField } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import { datesInOrder } from "#src/assistant/report/dates-in-order.ts";
import { ownTodo, todoSource } from "#src/assistant/report/own-todo.ts";
import type { MailSource } from "#src/assistant/report/types.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";

/** The limits of one run, against a run that a mail talks into mass changes. */
export const TODO_TOOL_LIMITS = { adds: 20, changes: 30 };

const MAX_TITLE_CHARS = 120;
const MAX_TEXT_CHARS = 400;
const DELETED_DAYS = 30;
const MAX_DELETED_TODOS = 100;

export interface StoredTodo {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  /** The fields that the owner set, which the agent may not change. */
  ownerEditedFields: readonly TodoEditableField[];
}

/** A to-do that the owner deleted, which the agent may not simply add again. */
export interface DeletedTodo {
  id: string;
  title: string;
  source: MailSource | null;
  deletedAt: Date;
}

interface NewTodo {
  /** Made up front, so that the report can name the to-do before it is stored. */
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  source: MailSource | null;
  /** The deleted to-do that this one brings back. */
  reAddsTodoId: string | null;
}

export type TodoEdit = Partial<
  Pick<StoredTodo, "title" | "detail" | "dueDate" | "startDate">
>;

/** What a run wants to change in the to-do list: nothing is written until the report is stored. */
export interface TodoChanges {
  added: NewTodo[];
  done: { id: string; title: string; reason: string }[];
  updated: { id: string; edit: TodoEdit }[];
}

/** The user's open to-dos, oldest first. */
export function readOpenTodos(scope: UserScope): Promise<StoredTodo[]> {
  return scope.db
    .select({
      id: todos.id,
      title: todos.title,
      detail: todos.detail,
      dueDate: todos.dueDate,
      startDate: todos.startDate,
      ownerEditedFields: todos.ownerEditedFields,
    })
    .from(todos)
    .where(and(ownTodo(scope), isNull(todos.doneAt)))
    .orderBy(asc(todos.createdAt), asc(todos.title));
}

/** The to-dos the user deleted in the last days, newest first. */
export async function readDeletedTodos(
  { db, userId }: UserScope,
  now: Date,
): Promise<DeletedTodo[]> {
  const rows = await db
    .select({
      id: todos.id,
      title: todos.title,
      sourceAccountId: todos.sourceAccountId,
      sourceMessageId: todos.sourceMessageId,
      deletedAt: todos.deletedAt,
    })
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNotNull(todos.deletedAt),
        gt(
          todos.deletedAt,
          new Date(now.getTime() - DELETED_DAYS * 86_400_000),
        ),
      ),
    )
    .orderBy(desc(todos.deletedAt))
    .limit(MAX_DELETED_TODOS);
  return rows.flatMap(({ deletedAt, id, title, ...row }) =>
    deletedAt ? [{ id, title, deletedAt, source: todoSource(row) }] : [],
  );
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
const startDate = z.iso
  .date()
  .describe(
    "YYYY-MM-DD, not after dueDate. The day the to-do joins the owner's list for today, for when a mail says when to act.",
  );

/**
 * Refuses a to-do that the owner deleted, and gives the id of the deleted
 * to-do that this one brings back. A new mail may bring one back, but only when
 * the agent says that it does: the mail must not be one that the owner already
 * saw when they deleted it.
 */
function deletedTodoToBringBack(
  deleted: ReadonlyMap<string, DeletedTodo>,
  input: { title: string; deletedTodo?: string },
  mail: { source: MailSource; receivedAt: Date } | null,
): string | null {
  const named =
    input.deletedTodo === undefined ? null : deleted.get(input.deletedTodo);
  if (named === undefined) {
    throw new ToolRefusal(
      `Unknown deleted to-do "${input.deletedTodo ?? ""}". Use an id from the prompt, such as "d1".`,
    );
  }
  for (const [key, todo] of deleted) {
    if (mail && todo.source && sameMail(todo.source, mail.source)) {
      throw new ToolRefusal(
        `The owner deleted a to-do from this mail (${key}: ${todo.title}). Do not add it again.`,
      );
    }
  }
  const sameTitle = [...deleted].filter(
    ([, todo]) => normal(todo.title) === normal(input.title),
  );
  if (sameTitle.length > 0 && !sameTitle.some(([, todo]) => todo === named)) {
    throw new ToolRefusal(
      `The owner deleted a to-do with this title (${sameTitle.map(([key]) => key).join(", ")}). Add it only if a new mail makes it matter more now: name it in deletedTodo and give that mail.`,
    );
  }
  if (!named) return null;
  if (!mail) {
    throw new ToolRefusal(
      "A to-do that brings back a deleted one needs the new mail about it.",
    );
  }
  if (mail.receivedAt <= named.deletedAt) {
    throw new ToolRefusal(
      "That mail came before the owner deleted the to-do, so it is not new. Do not add it again.",
    );
  }
  return named.id;
}

/**
 * The to-do tools of a run. They know only the open to-dos the run was
 * given, by short ids such as `t2`, and the to-dos the owner deleted, by ids
 * such as `d2`, and keep each change in memory; `applyTodoChanges` writes
 * them with the report.
 */
export function createTodoTools({
  openTodos,
  deletedTodos,
  sourceOf,
  receivedAtOf,
  limits = TODO_TOOL_LIMITS,
}: {
  /** The user's own open to-dos. */
  openTodos: readonly StoredTodo[];
  /** The to-dos the user deleted lately. */
  deletedTodos: readonly DeletedTodo[];
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
  type Entry =
    | { kind: "stored"; todo: StoredTodo; done: boolean }
    | { kind: "new"; todo: NewTodo; done: boolean };
  const entries = new Map<string, Entry>(
    openTodos.map((todo, index) => [
      `t${String(index + 1)}`,
      { kind: "stored", todo: { ...todo }, done: false },
    ]),
  );
  const deleted = new Map(
    deletedTodos.map((todo, index) => [`d${String(index + 1)}`, todo]),
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

  function ownerSet(entry: Entry) {
    return entry.kind === "stored" ? entry.todo.ownerEditedFields : [];
  }

  function view(key: string, entry: Entry) {
    return {
      todo: key,
      title: entry.todo.title,
      detail: entry.todo.detail,
      dueDate: entry.todo.dueDate,
      startDate: entry.todo.startDate,
      ownerSet: ownerSet(entry),
    };
  }

  const tools: AgentTools = {
    list_todos: agentTool({
      description:
        "The owner's open to-dos. ownerSet names the fields the owner set, which you cannot change.",
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
            !entry.done && normal(entry.todo.title) === normal(input.title),
        );
        if (same) {
          throw new ToolRefusal(
            `To-do ${same[0]} has that title already. Update it instead.`,
          );
        }
        const mail =
          input.mail === undefined
            ? null
            : {
                source: sourceOf(input.mail),
                receivedAt: receivedAtOf(input.mail),
              };
        const reAddsTodoId = deletedTodoToBringBack(deleted, input, mail);
        const todo: NewTodo = {
          id: randomUUID(),
          title: input.title,
          detail: input.detail || null,
          dueDate: input.dueDate ?? null,
          startDate: input.startDate ?? null,
          source: mail?.source ?? null,
          reAddsTodoId,
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
      describe: ({ todo: key }) => ({
        kind: "complete_todo",
        title: open(key).todo.title,
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
        "Changes an open to-do when mail changes it, such as a new due date. null clears detail, dueDate or startDate. The fields the owner set cannot change.",
      inputSchema: z.object({
        todo: todoKey,
        title: title.optional(),
        detail: detail.nullable().optional(),
        dueDate: dueDate.nullable().optional(),
        startDate: startDate.nullable().optional(),
      }),
      describe: ({ todo: key, title: newTitle }) => {
        const { title: oldTitle } = open(key).todo;
        return { kind: "update_todo", title: newTitle ?? oldTitle };
      },
      execute: ({ todo: key, ...input }) => {
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
 * Every write names the user, and a change reaches only a to-do that is still
 * open and not deleted, so one the owner closed or deleted during the run stays
 * as it is. The row is read again under a lock, so a field that the owner set
 * during the run stays as the owner set it, and dates that no longer fit the
 * owner's stay as they are.
 */
export async function applyTodoChanges(
  tx: Pick<AssistantDb, "insert" | "select" | "update">,
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
        startDate: todo.startDate,
        sourceAccountId: todo.source?.accountId ?? null,
        sourceMessageId: todo.source?.messageId ?? null,
        createdBy: "report" as const,
        reAddsTodoId: todo.reAddsTodoId,
        createdReportId: reportId,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
  const stillOpen = and(ownTodo({ userId }), isNull(todos.doneAt));
  const locked =
    changes.updated.length === 0
      ? []
      : await tx
          .select({
            id: todos.id,
            ownerEditedFields: todos.ownerEditedFields,
            dueDate: todos.dueDate,
            startDate: todos.startDate,
          })
          .from(todos)
          .where(
            and(
              stillOpen,
              inArray(
                todos.id,
                changes.updated.map(({ id }) => id),
              ),
            ),
          )
          .for("update");
  const stored = new Map(locked.map((row) => [row.id, row]));
  for (const { id, edit } of changes.updated) {
    const row = stored.get(id);
    if (!row) continue;
    const free = (field: TodoEditableField) =>
      !row.ownerEditedFields.includes(field);
    const allowed: TodoEdit = {};
    if (edit.title !== undefined && free("title")) allowed.title = edit.title;
    if (edit.detail !== undefined && free("detail")) {
      allowed.detail = edit.detail;
    }
    if (edit.dueDate !== undefined && free("dueDate")) {
      allowed.dueDate = edit.dueDate;
    }
    if (edit.startDate !== undefined && free("startDate")) {
      allowed.startDate = edit.startDate;
    }
    if (!datesInOrder({ ...row, ...allowed })) {
      delete allowed.dueDate;
      delete allowed.startDate;
    }
    if (Object.keys(allowed).length === 0) continue;
    stored.set(id, { ...row, ...allowed });
    await tx
      .update(todos)
      .set({ ...allowed, updatedAt: now })
      .where(and(stillOpen, eq(todos.id, id)));
  }
  for (const { id, reason } of changes.done) {
    await tx
      .update(todos)
      .set({ doneAt: now, doneReason: reason, updatedAt: now })
      .where(and(stillOpen, eq(todos.id, id)));
  }
}
