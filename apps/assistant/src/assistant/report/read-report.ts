import {
  and,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import {
  mailAccounts,
  morningReports,
  todoChecklistItems,
  todos,
  type TodoCreator,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { mailViewPath } from "#src/assistant/mail/view/mail-view-path.ts";
import { startsAfter, waitsAfter } from "./dates-in-order.ts";
import type { RepeatRule } from "./next-occurrence.ts";
import {
  checklistOfTodo,
  ownTodo,
  todoSource,
  type ChecklistItem,
} from "./own-todo.ts";
import type {
  AgendaItem,
  MailSource,
  MorningReportContent,
  ReportStatus,
} from "./types.ts";

/** How many done to-dos the to-do page lists. */
const RECENT_DONE_LIMIT = 5;
/** How many done to-dos one page of the archive lists. */
const DONE_PAGE_SIZE = 30;
/** How many to-dos a search lists. */
const SEARCH_LIMIT = 50;

export interface TodoView {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  repeat: RepeatRule | null;
  /** The time that it holds on the calendar. */
  calendarSlot: { start: Date; end: Date } | null;
  /** The occurrence that closing this one made. */
  nextId: string | null;
  /** Who or what it waits on. */
  waitingOn: string | null;
  followUpDate: string | null;
  /** Why the report agent made it wait or ended the wait. */
  waitingNote: string | null;
  checklist: readonly ChecklistItem[];
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
  /** The to-dos this report made wait that still wait, and that no line of `needsAction` shows. */
  waitingTodos: TodoView[];
  /** The to-dos this report moved back to open because the reply came, and that no line of `needsAction` shows. */
  repliedTodos: TodoView[];
}

/** Links each mail source to the page that shows it, while its account is still connected. */
async function hrefMaker({ db, userId }: UserScope) {
  const accounts = new Set(
    (
      await db
        .select({ id: mailAccounts.id })
        .from(mailAccounts)
        .where(eq(mailAccounts.userId, userId))
    ).map((account) => account.id),
  );
  return (source: MailSource | null) =>
    source && accounts.has(source.accountId)
      ? mailViewPath(source.accountId, source.messageId)
      : null;
}

const todoColumns = {
  id: todos.id,
  title: todos.title,
  detail: todos.detail,
  dueDate: todos.dueDate,
  startDate: todos.startDate,
  repeat: todos.repeat,
  calendarAccountId: todos.calendarAccountId,
  calendarStart: todos.calendarStart,
  calendarEnd: todos.calendarEnd,
  nextTodoId: todos.nextTodoId,
  waitingOn: todos.waitingOn,
  followUpDate: todos.followUpDate,
  waitingNote: todos.waitingNote,
  checklist: checklistOfTodo,
  createdAt: todos.createdAt,
  createdBy: todos.createdBy,
  doneAt: todos.doneAt,
  doneReason: todos.doneReason,
  reAddsTodoId: todos.reAddsTodoId,
  sourceAccountId: todos.sourceAccountId,
  sourceMessageId: todos.sourceMessageId,
};

export type TodoRow = Pick<
  typeof todos.$inferSelect,
  Exclude<keyof typeof todoColumns, "checklist">
> & { checklist: readonly ChecklistItem[] };

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
    calendarSlot:
      row.calendarAccountId && row.calendarStart && row.calendarEnd
        ? { start: row.calendarStart, end: row.calendarEnd }
        : null,
    nextId: row.nextTodoId,
    waitingOn: row.waitingOn,
    followUpDate: row.followUpDate,
    waitingNote: row.waitingNote,
    checklist: row.checklist,
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
 * after the report's day or still waits does not need the owner yet, so that
 * to-do shows with the report's other to-dos.
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
  const notYet = (todo: TodoView | null) =>
    todo !== null &&
    todo.doneAt === null &&
    (startsAfter(todo, report.localDate) || waitsAfter(todo, report.localDate));
  const later = lines.flatMap(({ todo, openHref }) =>
    todo && notYet(todo)
      ? [{ ...todo, openHref: todo.openHref ?? openHref }]
      : [],
  );
  const rowsOf = async (ids: readonly string[]) =>
    (ids.length === 0
      ? []
      : await scope.db
          .select(todoColumns)
          .from(todos)
          .where(and(ownTodo(scope), inArray(todos.id, [...ids])))
          .orderBy(todos.title)
    ).map(overlay);
  const closedRows = await rowsOf(
    content.version === 2 ? content.doneTodos.map((todo) => todo.id) : [],
  );
  const madeToWait = content.version === 2 ? content.waitingTodoIds : undefined;
  const replied = content.version === 2 ? content.repliedTodoIds : undefined;
  const shownLines = lines.filter(({ todo }) => !notYet(todo));
  const unshown = (row: TodoRow) =>
    !shownLines.some(({ todo }) => todo?.id === row.id);
  const reopened = closedRows.filter(
    (row) =>
      row.doneAt === null &&
      !linked.has(row.id) &&
      !created.some((own) => own.id === row.id),
  );
  return {
    ...report,
    needsAction: shownLines,
    worthKnowing: items(content.worthKnowing),
    todos: [
      ...[...created.filter((row) => !linked.has(row.id)), ...reopened].map(
        (row) => toTodoView(row, hrefOf),
      ),
      ...later.filter(
        (todo) => !madeToWait?.includes(todo.id) && !replied?.includes(todo.id),
      ),
    ].sort((a, b) => Number(a.doneAt !== null) - Number(b.doneAt !== null)),
    agenda: content.version === 2 ? content.agenda : null,
    doneTodos: closedRows
      .filter((row) => row.doneAt !== null)
      .map((row) => toTodoView(row, hrefOf)),
    waitingTodos: (await rowsOf(madeToWait ?? []))
      .filter(
        (row) => row.doneAt === null && row.waitingOn !== null && unshown(row),
      )
      .map((row) => toTodoView(row, hrefOf)),
    repliedTodos: (await rowsOf(replied ?? []))
      .filter(
        (row) => row.doneAt === null && row.waitingOn === null && unshown(row),
      )
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
    .orderBy(desc(todos.doneAt), desc(todos.id))
    .limit(RECENT_DONE_LIMIT);
  return {
    open,
    done: done.map((row) => toTodoView(row, hrefOf)),
  };
}

/**
 * One page of the done to-dos, newest first. A page after the last one gives
 * the last one, because a reopen can take the last row of the last page away.
 */
export async function listDoneTodos(scope: UserScope, askedPage: number) {
  const isDone = and(ownTodo(scope), isNotNull(todos.doneAt));
  const total = await scope.db.$count(todos, isDone);
  const pageCount = Math.max(1, Math.ceil(total / DONE_PAGE_SIZE));
  const page = Math.min(askedPage, pageCount);
  const hrefOf = await hrefMaker(scope);
  const rows = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(isDone)
    .orderBy(desc(todos.doneAt), desc(todos.id))
    .limit(DONE_PAGE_SIZE)
    .offset((page - 1) * DONE_PAGE_SIZE);
  return {
    todos: rows.map((row) => toTodoView(row, hrefOf)),
    page,
    pageCount,
  };
}

function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/**
 * The to-dos, open and done, whose title, detail or a checklist step holds
 * `term`, whatever its case: the open ones in the owner's order, then the done
 * ones, newest first. `hasMore` says that the list stops before the last match.
 */
export async function searchTodos(scope: UserScope, term: string) {
  const pattern = containsPattern(term);
  const hrefOf = await hrefMaker(scope);
  const rows = await scope.db
    .select(todoColumns)
    .from(todos)
    .where(
      and(
        ownTodo(scope),
        or(
          ilike(todos.title, pattern),
          ilike(todos.detail, pattern),
          exists(
            scope.db
              .select({ found: sql`1` })
              .from(todoChecklistItems)
              .where(
                and(
                  eq(todoChecklistItems.userId, scope.userId),
                  eq(todoChecklistItems.todoId, todos.id),
                  ilike(todoChecklistItems.text, pattern),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(sql`${todos.doneAt} desc nulls first`, todos.position)
    .limit(SEARCH_LIMIT + 1);
  return {
    todos: rows.slice(0, SEARCH_LIMIT).map((row) => toTodoView(row, hrefOf)),
    hasMore: rows.length > SEARCH_LIMIT,
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
