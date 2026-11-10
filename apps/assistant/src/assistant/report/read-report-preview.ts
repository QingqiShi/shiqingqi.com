import { eq } from "drizzle-orm";
import type { TodoEdit } from "#src/assistant/agent/todos/types.ts";
import {
  morningReportPreviews,
  type ReportPreviewError,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  countOpenTodos,
  toReportView,
  type ReportView,
  type TodoRow,
} from "./read-report.ts";

/** The most a function may run: a `running` row this old has no function left to end it. */
export const REPORT_PREVIEW_STALE_MS = 800_000;

interface BuiltPreview {
  builtAt: Date;
  report: ReportView;
  /** The open to-dos the owner would have after the report. */
  openTodos: number;
}

export type ReportPreview =
  | { status: "running" }
  | {
      status: "failed";
      /** `interrupted`: the function stopped before it could end the preview. */
      reason: ReportPreviewError | "interrupted";
      /** The last preview that was built, if any. */
      last?: BuiltPreview;
    }
  | ({ status: "done" } & BuiltPreview);

/** The user's latest preview, as the page shows it, or null when there is none. */
export async function readReportPreview(
  scope: UserScope,
  now: Date,
): Promise<ReportPreview | null> {
  const row = (
    await scope.db
      .select()
      .from(morningReportPreviews)
      .where(eq(morningReportPreviews.userId, scope.userId))
  ).at(0);
  if (!row) return null;
  if (row.status === "running") {
    if (now.getTime() - row.startedAt.getTime() < REPORT_PREVIEW_STALE_MS) {
      return { status: "running" };
    }
    return failed("interrupted", await builtPreview(scope, row));
  }
  const built = await builtPreview(scope, row);
  if (row.status === "failed" || !built) {
    return failed(row.error ?? "error", built);
  }
  return { status: "done", ...built };
}

function failed(
  reason: ReportPreviewError | "interrupted",
  last: BuiltPreview | null,
): ReportPreview {
  return last
    ? { status: "failed", reason, last }
    : { status: "failed", reason };
}

/** The preview that the row holds as the page shows it, or null when none was built. */
async function builtPreview(
  scope: UserScope,
  row: typeof morningReportPreviews.$inferSelect,
): Promise<BuiltPreview | null> {
  const { content, todoChanges: changes, builtAt } = row;
  if (!content || !changes || !builtAt) return null;
  const created = changes.added.map((todo): TodoRow => ({
    id: todo.id,
    title: todo.title,
    detail: todo.detail,
    dueDate: todo.dueDate,
    startDate: todo.startDate,
    calendarAccountId: null,
    calendarStart: null,
    calendarEnd: null,
    waitingOn: todo.waitingOn ?? null,
    followUpDate: todo.followUpDate ?? null,
    waitingNote: todo.waitingNote ?? null,
    checklist: [],
    createdAt: builtAt,
    createdBy: "report",
    doneAt: null,
    doneReason: null,
    reAddsTodoId: todo.reAddsTodoId,
    sourceAccountId: todo.source?.accountId ?? null,
    sourceMessageId: todo.source?.messageId ?? null,
  }));
  const edits = new Map<string, TodoEdit>();
  for (const { id, edit } of changes.updated) {
    edits.set(id, { ...edits.get(id), ...edit });
  }
  const waits = new Map<
    string,
    Pick<TodoRow, "waitingOn" | "waitingNote"> &
      Partial<Pick<TodoRow, "followUpDate">>
  >();
  for (const { id, waitingOn, followUpDate, reason } of changes.waiting ?? []) {
    waits.set(id, {
      waitingOn,
      waitingNote: reason,
      ...(followUpDate === undefined ? {} : { followUpDate }),
    });
  }
  for (const { id, reason } of changes.replied ?? []) {
    waits.set(id, { waitingOn: null, followUpDate: null, waitingNote: reason });
  }
  const closed = new Map(changes.done.map(({ id, reason }) => [id, reason]));
  const [report, openNow] = await Promise.all([
    toReportView(
      scope,
      { id: "preview", localDate: row.localDate, content },
      created,
      (todo) => ({
        ...todo,
        ...edits.get(todo.id),
        ...waits.get(todo.id),
        doneAt: closed.has(todo.id) ? builtAt : todo.doneAt,
        doneReason: closed.get(todo.id) ?? todo.doneReason,
      }),
    ),
    countOpenTodos(scope),
  ]);
  return {
    builtAt,
    report,
    openTodos: Math.max(0, openNow + created.length - changes.done.length),
  };
}
