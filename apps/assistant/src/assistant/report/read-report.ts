import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  mailAccounts,
  morningReports,
  todos,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { openMailHref } from "./open-mail-href.ts";
import type { AgendaItem, MailSource, MorningReportContent } from "./types.ts";

/** How many done to-dos the to-do page lists. */
const DONE_LIMIT = 50;

export interface TodoView {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  createdAt: Date;
  doneAt: Date | null;
  openHref: string | null;
}

export interface ReportItemView {
  text: string;
  openHref: string | null;
  /** The to-do for this line, which the page shows in its place; null when there is none. */
  todo: TodoView | null;
}

export interface ReportView {
  id: string;
  localDate: string;
  content: MorningReportContent;
  needsAction: ReportItemView[];
  worthKnowing: ReportItemView[];
  /** The to-dos this report made that no line of `needsAction` shows, open first. */
  todos: TodoView[];
  /** Today's events; null when the report has no agenda. */
  agenda: AgendaItem[] | null;
  /** The to-dos this report closed, with the reason as their detail. */
  doneTodos: TodoView[];
}

async function hrefMaker({ db, userId }: UserScope) {
  const accounts = new Map(
    (
      await db
        .select({
          id: mailAccounts.id,
          provider: mailAccounts.provider,
          address: mailAccounts.address,
        })
        .from(mailAccounts)
        .where(eq(mailAccounts.userId, userId))
    ).map((account) => [account.id, account]),
  );
  return (source: MailSource | null) => {
    const account = source ? accounts.get(source.accountId) : undefined;
    return source && account
      ? openMailHref({
          provider: account.provider,
          accountAddress: account.address,
          messageId: source.messageId,
        })
      : null;
  };
}

const todoColumns = {
  id: todos.id,
  title: todos.title,
  detail: todos.detail,
  dueDate: todos.dueDate,
  createdAt: todos.createdAt,
  doneAt: todos.doneAt,
  sourceAccountId: todos.sourceAccountId,
  sourceMessageId: todos.sourceMessageId,
};

type TodoRow = Pick<typeof todos.$inferSelect, keyof typeof todoColumns>;

function toTodoView(
  row: TodoRow,
  hrefOf: (source: MailSource | null) => string | null,
): TodoView {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    doneAt: row.doneAt,
    openHref: hrefOf(
      row.sourceAccountId && row.sourceMessageId
        ? { accountId: row.sourceAccountId, messageId: row.sourceMessageId }
        : null,
    ),
  };
}

/** The report of `localDate`, or the newest one when it is null. */
export async function readReport(
  scope: UserScope,
  localDate: string | null,
): Promise<ReportView | null> {
  const report = (
    await scope.db
      .select({
        id: morningReports.id,
        localDate: morningReports.localDate,
        content: morningReports.content,
      })
      .from(morningReports)
      .where(
        and(
          eq(morningReports.userId, scope.userId),
          localDate === null
            ? undefined
            : eq(morningReports.localDate, localDate),
        ),
      )
      .orderBy(desc(morningReports.localDate))
      .limit(1)
  ).at(0);
  if (!report) return null;
  const hrefOf = await hrefMaker(scope);
  const rows = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(
      and(eq(todos.userId, scope.userId), eq(todos.createdReportId, report.id)),
    )
    .orderBy(desc(todos.createdAt), todos.title);
  const { content } = report;
  const linkedIds = content.needsAction.flatMap((item) =>
    item.todoId ? [item.todoId] : [],
  );
  const linked = new Map(
    (linkedIds.length === 0
      ? []
      : await scope.db
          .select(todoColumns)
          .from(todos)
          .where(
            and(eq(todos.userId, scope.userId), inArray(todos.id, linkedIds)),
          )
    ).map((row) => [row.id, toTodoView(row, hrefOf)]),
  );
  const items = (list: MorningReportContent["needsAction"]) =>
    list.map((item) => ({
      text: item.text,
      openHref: hrefOf(item.source),
      todo: item.todoId ? (linked.get(item.todoId) ?? null) : null,
    }));
  const closed = content.version === 2 ? content.doneTodos : [];
  const reasons = new Map(closed.map((todo) => [todo.id, todo.reason]));
  const closedRows =
    closed.length === 0
      ? []
      : await scope.db
          .select(todoColumns)
          .from(todos)
          .where(
            and(
              eq(todos.userId, scope.userId),
              inArray(todos.id, [...reasons.keys()]),
            ),
          )
          .orderBy(todos.title);
  return {
    ...report,
    needsAction: items(content.needsAction),
    worthKnowing: items(content.worthKnowing),
    todos: rows
      .filter((row) => !linked.has(row.id))
      .map((row) => toTodoView(row, hrefOf))
      .sort((a, b) => Number(a.doneAt !== null) - Number(b.doneAt !== null)),
    agenda: content.version === 2 ? content.agenda : null,
    doneTodos: closedRows.map((row) => ({
      ...toTodoView(row, hrefOf),
      detail: reasons.get(row.id) ?? row.detail,
    })),
  };
}

/** Every open to-do, newest first, and the latest done ones. */
export async function listTodos(scope: UserScope) {
  const hrefOf = await hrefMaker(scope);
  const open = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(and(eq(todos.userId, scope.userId), isNull(todos.doneAt)))
    .orderBy(desc(todos.createdAt), todos.title);
  const done = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(and(eq(todos.userId, scope.userId), isNotNull(todos.doneAt)))
    .orderBy(desc(todos.doneAt))
    .limit(DONE_LIMIT);
  return {
    open: open.map((row) => toTodoView(row, hrefOf)),
    done: done.map((row) => toTodoView(row, hrefOf)),
  };
}

/** The past reports, newest first: their date and headline. */
export async function listReports({ db, userId }: UserScope) {
  const rows = await db
    .select({
      localDate: morningReports.localDate,
      content: morningReports.content,
    })
    .from(morningReports)
    .where(eq(morningReports.userId, userId))
    .orderBy(desc(morningReports.localDate));
  return rows.map((row) => ({
    localDate: row.localDate,
    status: row.content.status,
    headline: row.content.headline,
    needsAction: row.content.needsAction.length,
  }));
}

export async function countOpenTodos({ db, userId }: UserScope) {
  return db.$count(todos, and(eq(todos.userId, userId), isNull(todos.doneAt)));
}

/** Marks a to-do done or open again. False when the user has no such to-do. */
export async function setTodoDone(
  { db, userId }: UserScope,
  todoId: string,
  done: boolean,
  now: Date,
): Promise<boolean> {
  const updated = await db
    .update(todos)
    .set({ doneAt: done ? now : null })
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.id, todoId),
        done ? isNull(todos.doneAt) : isNotNull(todos.doneAt),
      ),
    )
    .returning({ id: todos.id });
  if (updated.length > 0) return true;
  return (
    (await db.$count(
      todos,
      and(eq(todos.userId, userId), eq(todos.id, todoId)),
    )) > 0
  );
}
