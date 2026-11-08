import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import {
  agentActions,
  todos,
  type TodoActionKind,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { datesInOrder } from "#src/assistant/report/dates-in-order.ts";
import { ownTodo } from "#src/assistant/report/own-todo.ts";
import {
  TODO_PLAIN_FIELDS,
  type TodoActionDetail,
  type TodoActionFields,
} from "./todo-action-detail.ts";
import type { TodoChanges, TodoEdit } from "./types.ts";

const NOT_WAITING = {
  waitingOn: null,
  followUpDate: null,
  waitingSince: null,
  waitingNote: null,
};

/** What an undo needs to put a wait back. */
function waitOf(row: {
  waitingOn: string | null;
  followUpDate: string | null;
  waitingSince: Date | null;
  waitingNote: string | null;
}): TodoActionFields {
  return {
    waitingOn: row.waitingOn,
    followUpDate: row.followUpDate,
    waitingSince: row.waitingSince?.toISOString() ?? null,
    waitingNote: row.waitingNote,
  };
}

/**
 * Writes the changes of a run in the transaction that stores its report, each
 * with an `agent_actions` row that holds what it replaced. Every write names the
 * user, and a change reaches only a to-do that is still open and not deleted, so
 * one the owner closed or deleted during the run stays as it is, with no row. The
 * row is read again under a lock, so a field that the owner set during the run
 * stays as the owner set it, and dates that no longer fit the owner's stay as they
 * are. A wait that the owner began during the run does not end by a mail from
 * before it.
 */
export async function applyTodoChanges(
  tx: Pick<AssistantDb, "insert" | "select" | "update">,
  {
    userId,
    reportId,
    runId,
    now,
    changes,
  }: {
    userId: string;
    reportId: string;
    /** The agent run that made the changes. */
    runId: string;
    now: Date;
    changes: TodoChanges;
  },
) {
  const actions: {
    kind: TodoActionKind;
    reason: string;
    detail: TodoActionDetail;
  }[] = [];
  if (changes.added.length > 0) {
    await tx.insert(todos).values(
      changes.added.map((todo) => ({
        id: todo.id,
        userId,
        title: todo.title,
        detail: todo.detail,
        dueDate: todo.dueDate,
        startDate: todo.startDate,
        waitingOn: todo.waitingOn,
        followUpDate: todo.followUpDate,
        waitingSince: todo.waitingSince ? new Date(todo.waitingSince) : null,
        waitingNote: todo.waitingNote,
        sourceAccountId: todo.source?.accountId ?? null,
        sourceMessageId: todo.source?.messageId ?? null,
        createdBy: "report" as const,
        reAddsTodoId: todo.reAddsTodoId,
        createdReportId: reportId,
        createdAt: now,
        updatedAt: now,
      })),
    );
    for (const todo of changes.added) {
      actions.push({
        kind: "add_todo",
        reason: todo.reason,
        detail: {
          todoId: todo.id,
          title: todo.title,
          before: {},
          after: {
            dueDate: todo.dueDate,
            startDate: todo.startDate,
            waitingOn: todo.waitingOn ?? null,
          },
        },
      });
    }
  }
  const stillOpen = and(ownTodo({ userId }), isNull(todos.doneAt));
  const { waiting = [], replied = [] } = changes;
  const lockedIds = [
    ...changes.updated,
    ...waiting,
    ...replied,
    ...changes.done,
  ].map(({ id }) => id);
  const locked =
    lockedIds.length === 0
      ? []
      : await tx
          .select({
            id: todos.id,
            ownerEditedFields: todos.ownerEditedFields,
            title: todos.title,
            detail: todos.detail,
            dueDate: todos.dueDate,
            startDate: todos.startDate,
            waitingOn: todos.waitingOn,
            followUpDate: todos.followUpDate,
            waitingSince: todos.waitingSince,
            waitingNote: todos.waitingNote,
          })
          .from(todos)
          .where(and(stillOpen, inArray(todos.id, lockedIds)))
          .for("update");
  const stored = new Map(locked.map((row) => [row.id, row]));
  for (const { id, edit, reason } of changes.updated) {
    const row = stored.get(id);
    if (!row) continue;
    const allowed: TodoEdit = {};
    for (const field of TODO_PLAIN_FIELDS) {
      const value = edit[field];
      if (
        value !== undefined &&
        value !== row[field] &&
        !row.ownerEditedFields.includes(field)
      ) {
        Object.assign(allowed, { [field]: value });
      }
    }
    if (!datesInOrder({ ...row, ...allowed })) {
      delete allowed.dueDate;
      delete allowed.startDate;
    }
    const written = TODO_PLAIN_FIELDS.filter((field) => field in allowed);
    if (written.length === 0) continue;
    const next = { ...row, ...allowed };
    stored.set(id, next);
    await tx
      .update(todos)
      .set({ ...allowed, updatedAt: now })
      .where(and(stillOpen, eq(todos.id, id)));
    actions.push({
      kind: "update_todo",
      reason,
      detail: {
        todoId: id,
        title: next.title,
        before: Object.fromEntries(written.map((field) => [field, row[field]])),
        after: allowed,
      },
    });
  }
  for (const { id, waitingOn, followUpDate, since, reason } of waiting) {
    const row = stored.get(id);
    if (!row || row.ownerEditedFields.includes("waitingOn")) continue;
    const next = {
      ...row,
      waitingOn,
      waitingSince: new Date(since),
      waitingNote: reason,
      followUpDate:
        followUpDate !== undefined &&
        !row.ownerEditedFields.includes("followUpDate")
          ? followUpDate
          : row.followUpDate,
    };
    stored.set(id, next);
    await tx
      .update(todos)
      .set({
        waitingOn: next.waitingOn,
        followUpDate: next.followUpDate,
        waitingSince: next.waitingSince,
        waitingNote: next.waitingNote,
        updatedAt: now,
      })
      .where(and(stillOpen, eq(todos.id, id)));
    actions.push({
      kind: "mark_waiting",
      reason,
      detail: {
        todoId: id,
        title: row.title,
        before: waitOf(row),
        after: waitOf(next),
      },
    });
  }
  for (const { id, reason, mailAt } of replied) {
    const row = stored.get(id);
    if (!row?.waitingSince || row.waitingSince >= new Date(mailAt)) continue;
    const next = { ...row, ...NOT_WAITING, waitingNote: reason };
    stored.set(id, next);
    await tx
      .update(todos)
      .set({ ...NOT_WAITING, waitingNote: reason, updatedAt: now })
      .where(and(stillOpen, eq(todos.id, id)));
    actions.push({
      kind: "reply_came",
      reason,
      detail: {
        todoId: id,
        title: row.title,
        before: waitOf(row),
        after: waitOf(next),
      },
    });
  }
  for (const { id, reason, mailAt } of changes.done) {
    const closed = await tx
      .update(todos)
      .set({ ...NOT_WAITING, doneAt: now, doneReason: reason, updatedAt: now })
      .where(
        and(
          stillOpen,
          eq(todos.id, id),
          mailAt === undefined
            ? isNull(todos.waitingSince)
            : or(
                isNull(todos.waitingSince),
                lt(todos.waitingSince, new Date(mailAt)),
              ),
        ),
      )
      .returning({ title: todos.title });
    for (const row of closed) {
      const before = stored.get(id);
      actions.push({
        kind: "complete_todo",
        reason,
        detail: {
          todoId: id,
          title: row.title,
          before: before ? waitOf(before) : {},
          after: NOT_WAITING,
          doneAt: now.toISOString(),
        },
      });
    }
  }
  if (actions.length > 0) {
    await tx.insert(agentActions).values(
      actions.map((action, index) => ({
        ...action,
        runId,
        userId,
        // An undo goes newest first, and one transaction has one clock time.
        createdAt: new Date(now.getTime() + index),
      })),
    );
  }
}
