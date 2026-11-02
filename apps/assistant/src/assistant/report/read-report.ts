import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  mailAccounts,
  morningReports,
  todos,
  type TodoCreator,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { startsAfter } from "./dates-in-order.ts";
import type { RepeatRule } from "./next-occurrence.ts";
import { openMailHref } from "./open-mail-href.ts";
import { ownTodo, todoSource } from "./own-todo.ts";
import type {
  AgendaItem,
  MailSource,
  MorningReportContent,
  ReportStatus,
} from "./types.ts";

/** How many done to-dos the to-do page lists. */
const DONE_LIMIT = 50;

export interface TodoView {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  repeat: RepeatRule | null;
  /** The time that the owner asked to be reminded. */
  remindAt: Date | null;
  /** When the next reminder goes out; null when none will. */
  nextReminderAt: Date | null;
  /** The occurrence that closing this one made. */
  nextId: string | null;
  createdAt: Date;
  createdBy: TodoCreator;
  doneAt: Date | null;
  /** Why the report agent closed it. */
  doneReason: string | null;
  /** The owner deleted this to-do before, and a new mail brought it back. */
  reAdded: boolean;
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
  /** The to-dos this report made or named that no line of `needsAction` shows, open first. */
  todos: TodoView[];
  /** Today's events; null when the report has no agenda. */
  agenda: AgendaItem[] | null;
  /** The to-dos this report closed that are still closed. */
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
  startDate: todos.startDate,
  repeat: todos.repeat,
  remindAt: todos.remindAt,
  snoozedUntil: todos.snoozedUntil,
  remindedAt: todos.remindedAt,
  nextTodoId: todos.nextTodoId,
  createdAt: todos.createdAt,
  createdBy: todos.createdBy,
  doneAt: todos.doneAt,
  doneReason: todos.doneReason,
  reAddsTodoId: todos.reAddsTodoId,
  sourceAccountId: todos.sourceAccountId,
  sourceMessageId: todos.sourceMessageId,
};

export type TodoRow = Pick<typeof todos.$inferSelect, keyof typeof todoColumns>;

function toTodoView(
  row: TodoRow,
  hrefOf: (source: MailSource | null) => string | null,
): TodoView {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    dueDate: row.dueDate,
    startDate: row.startDate,
    repeat: row.repeat,
    remindAt: row.remindAt,
    nextReminderAt: row.remindedAt ? null : (row.snoozedUntil ?? row.remindAt),
    nextId: row.nextTodoId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    doneAt: row.doneAt,
    doneReason: row.doneReason,
    reAdded: Boolean(row.reAddsTodoId),
    openHref: hrefOf(todoSource(row)),
  };
}

/**
 * Turns a report into what the page shows. `created` are the to-dos the
 * report made. `overlay` gives a stored to-do the state the report leaves it
 * in, for a report whose changes are not stored. A line whose to-do starts
 * after the report's day does not need the owner yet, so that to-do shows with
 * the report's other to-dos.
 */
export async function toReportView(
  scope: UserScope,
  report: { id: string; localDate: string; content: MorningReportContent },
  created: readonly TodoRow[],
  overlay: (row: TodoRow) => TodoRow = (row) => row,
): Promise<ReportView> {
  const hrefOf = await hrefMaker(scope);
  const { content } = report;
  const linkedIds = content.needsAction.flatMap((item) =>
    item.todoId ? [item.todoId] : [],
  );
  const linked = new Map(
    [
      ...(linkedIds.length === 0
        ? []
        : await scope.db
            .select(todoColumns)
            .from(todos)
            .where(and(ownTodo(scope), inArray(todos.id, linkedIds)))
      ).map(overlay),
      ...created.filter((row) => linkedIds.includes(row.id)),
    ].map((row) => [row.id, toTodoView(row, hrefOf)]),
  );
  const items = (list: MorningReportContent["needsAction"]) =>
    list.map((item) => ({
      text: item.text,
      openHref: hrefOf(item.source),
      todo: item.todoId ? (linked.get(item.todoId) ?? null) : null,
    }));
  const lines = items(content.needsAction);
  const waits = (todo: TodoView | null) =>
    todo !== null &&
    todo.doneAt === null &&
    startsAfter(todo, report.localDate);
  const waiting = lines.flatMap(({ todo, openHref }) =>
    todo && waits(todo)
      ? [{ ...todo, openHref: todo.openHref ?? openHref }]
      : [],
  );
  const closedIds =
    content.version === 2 ? content.doneTodos.map((todo) => todo.id) : [];
  const closedRows = (
    closedIds.length === 0
      ? []
      : await scope.db
          .select(todoColumns)
          .from(todos)
          .where(and(ownTodo(scope), inArray(todos.id, closedIds)))
          .orderBy(todos.title)
  ).map(overlay);
  const reopened = closedRows.filter(
    (row) =>
      row.doneAt === null &&
      !linked.has(row.id) &&
      !created.some((own) => own.id === row.id),
  );
  return {
    ...report,
    needsAction: lines.filter(({ todo }) => !waits(todo)),
    worthKnowing: items(content.worthKnowing),
    todos: [
      ...[...created.filter((row) => !linked.has(row.id)), ...reopened].map(
        (row) => toTodoView(row, hrefOf),
      ),
      ...waiting,
    ].sort((a, b) => Number(a.doneAt !== null) - Number(b.doneAt !== null)),
    agenda: content.version === 2 ? content.agenda : null,
    doneTodos: closedRows
      .filter((row) => row.doneAt !== null)
      .map((row) => toTodoView(row, hrefOf)),
  };
}

/** The report of `localDate`, or the newest one when it is null. */
export async function readReport(
  scope: UserScope,
  localDate: string | null,
): Promise<(ReportView & { seenAt: Date | null }) | null> {
  const report = (
    await scope.db
      .select({
        id: morningReports.id,
        localDate: morningReports.localDate,
        seenAt: morningReports.seenAt,
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
  const created = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(and(ownTodo(scope), eq(todos.createdReportId, report.id)))
    .orderBy(desc(todos.createdAt), todos.title);
  return {
    ...(await toReportView(scope, report, created)),
    seenAt: report.seenAt,
  };
}

async function readOpenTodos(
  scope: UserScope,
  hrefOf: (source: MailSource | null) => string | null,
) {
  const rows = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(and(ownTodo(scope), isNull(todos.doneAt)))
    .orderBy(todos.position);
  return rows.map((row) => toTodoView(row, hrefOf));
}

/** Every open to-do, in the owner's order. */
export async function listOpenTodos(scope: UserScope) {
  return readOpenTodos(scope, await hrefMaker(scope));
}

/** Every open to-do, in the owner's order, and the latest done ones. */
export async function listTodos(scope: UserScope) {
  const hrefOf = await hrefMaker(scope);
  const open = await readOpenTodos(scope, hrefOf);
  const done = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(and(ownTodo(scope), isNotNull(todos.doneAt)))
    .orderBy(desc(todos.doneAt))
    .limit(DONE_LIMIT);
  return {
    open,
    done: done.map((row) => toTodoView(row, hrefOf)),
  };
}

function selectReportItems({ db, userId }: UserScope) {
  return db
    .select({
      localDate: morningReports.localDate,
      status: sql<ReportStatus>`${morningReports.content}->>'status'`,
      headline: sql<string | null>`${morningReports.content}->>'headline'`,
      needsAction: sql<number>`jsonb_array_length(${morningReports.content}->'needsAction')`,
    })
    .from(morningReports)
    .where(eq(morningReports.userId, userId))
    .orderBy(desc(morningReports.localDate));
}

/** The past reports, newest first: their date and headline. */
export async function listReports(scope: UserScope) {
  return selectReportItems(scope);
}

/** The date and headline of the newest report; null when there is none. */
export async function readNewestReportItem(scope: UserScope) {
  return (await selectReportItems(scope).limit(1)).at(0) ?? null;
}

export type ReportListItem = Awaited<ReturnType<typeof listReports>>[number];

export async function countOpenTodos(scope: UserScope) {
  return scope.db.$count(todos, and(ownTodo(scope), isNull(todos.doneAt)));
}

/** Marks a report seen, the first time only. False when the user has no such report. */
export async function markReportSeen(
  { db, userId }: UserScope,
  reportId: string,
  now: Date,
): Promise<boolean> {
  const own = and(
    eq(morningReports.userId, userId),
    eq(morningReports.id, reportId),
  );
  const updated = await db
    .update(morningReports)
    .set({ seenAt: now })
    .where(and(own, isNull(morningReports.seenAt)))
    .returning({ id: morningReports.id });
  if (updated.length > 0) return true;
  return (await db.$count(morningReports, own)) > 0;
}
