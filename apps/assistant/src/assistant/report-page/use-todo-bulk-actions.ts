import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { assistantFetch } from "../http/assistant-fetch.ts";
import type { DueDateChange } from "../report/change-due-dates.ts";
import { datesInOrder } from "../report/dates-in-order.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { closeRow, nextRowOf, reopenRow } from "./close-row.ts";
import { formatListDay } from "./format-day.ts";
import { groupOf } from "./group-open-todos.ts";
import { inOrder, withDueDates, type TodoRows } from "./patch-row.ts";
import { sendBulk } from "./send-bulk.ts";
import { isOpen, type TodoItemData } from "./to-todo-item-data.ts";
import type {
  ShowDeleted,
  TodoStore,
  WordedToast,
} from "./todo-store-provider.tsx";
import type { RunTodoOp } from "./use-optimistic-todos.ts";
import type { ReleaseSlots } from "./use-todo-slot-actions.ts";

function isOverdue(row: TodoItemData, today: string) {
  return isOpen(row) && groupOf(row, today) === "overdue";
}

function sendDueDates(changes: readonly DueDateChange[]) {
  return assistantFetch("/api/todos", {
    method: "PATCH",
    body: JSON.stringify({ changes }),
  });
}

/** A change of many due dates, and its undo. A change that the server refused needs no undo. */
function dueDatesMove(changes: readonly DueDateChange[]) {
  let earlier: readonly DueDateChange[] = [];
  return {
    send: async () => {
      const response = await sendDueDates(changes);
      const body = (await response.json()) as { earlier: DueDateChange[] };
      earlier = body.earlier;
    },
    undo: () =>
      earlier.length === 0 ? Promise.resolve() : sendDueDates(earlier),
  };
}

export function useTodoBulkActions({
  rows,
  run,
  today,
  locale,
  slotRelease,
  showDeleted,
}: {
  rows: TodoRows;
  run: RunTodoOp;
  today: string;
  locale: string;
  slotRelease: ReleaseSlots;
  showDeleted: ShowDeleted;
}): Pick<
  TodoStore,
  "moveOverdueToToday" | "closeMany" | "removeMany" | "moveMany"
> {
  const showToast = useToast();
  const copy = {
    undo: t({ en: "Undo", zh: "撤销" }),
    moved: t({ en: "Moved {count} to today", zh: "已把 {count} 项移到今天" }),
    doneMany: t({ en: "{count} done", zh: "已完成 {count} 项" }),
    deletedMany: t({ en: "{count} deleted", zh: "已删除 {count} 项" }),
    deletedManySeries: t({
      en: "{count} deleted. Those that repeat will not come back",
      zh: "已删除 {count} 项，重复的待办不会再出现",
    }),
    movedMany: t({
      en: "Moved {count} to {date}",
      zh: "已把 {count} 项移到 {date}",
    }),
    undatedMany: t({
      en: "Took the date off {count}",
      zh: "已取消 {count} 项的日期",
    }),
  };

  return {
    moveOverdueToToday: () => {
      const overdue = rows
        .filter((row) => isOverdue(row, today))
        .slice(0, todoLimits.bulkTodos);
      if (overdue.length === 0) return;
      const moved = overdue.map(({ id }) => ({
        id,
        dueDate: today,
        ownerSet: true,
      }));
      const move = dueDatesMove(moved);
      run(withDueDates(moved), move.send);
      showToast({
        message: copy.moved.replace("{count}", String(overdue.length)),
        action: {
          label: copy.undo,
          onAction: () => {
            run(withDueDates(overdue), move.undo);
          },
        },
      });
    },
    closeMany: (ids) => {
      const closing = rows
        .filter((row) => ids.includes(row.id) && isOpen(row))
        .map((row) => ({ id: row.id, next: nextRowOf(row, today) }));
      if (closing.length === 0) return;
      const doneAt = new Date().toISOString();
      let closed: readonly string[] = [];
      const release = slotRelease(
        rows.filter((row) => ids.includes(row.id) && isOpen(row)),
      );
      const closedToast: WordedToast = {
        message: copy.doneMany.replace("{count}", String(closing.length)),
        action: {
          label: copy.undo,
          onAction: () => {
            run(inOrder(closing.map(({ id }) => reopenRow(id))), () =>
              closed.length === 0
                ? Promise.resolve()
                : sendBulk({ action: "reopen", ids: closed }),
            );
            release.addBack();
          },
        },
      };
      run(
        inOrder(closing.map(({ id, next }) => closeRow(id, next, doneAt))),
        async () => {
          const response = await sendBulk({
            action: "done",
            todos: closing.map(({ id, next }) => ({ id, nextId: next?.id })),
          });
          const body = (await response.clone().json()) as { closed: string[] };
          closed = body.closed;
          await release.tell(response, closedToast);
        },
      );
      showToast(closedToast);
    },
    removeMany: (ids) => {
      const removing = rows.flatMap((row, index) =>
        ids.includes(row.id) ? [{ row, index }] : [],
      );
      if (removing.length === 0) return;
      const removedIds = removing.map(({ row }) => row.id);
      const release = slotRelease(removing.map(({ row }) => row));
      const deletedToast = showDeleted(
        removing.map(({ row }) => row),
        (removing.some(({ row }) => row.repeat && isOpen(row))
          ? copy.deletedManySeries
          : copy.deletedMany
        ).replace("{count}", String(removing.length)),
        () => {
          run(
            (list) =>
              removing.reduce(
                (restored, { row, index }) =>
                  restored.some((entry) => entry.id === row.id)
                    ? restored
                    : restored.toSpliced(index, 0, row),
                list,
              ),
            () => sendBulk({ action: "restore", ids: removedIds }),
          );
          release.addBack();
        },
      );
      run(
        (list) => list.filter((entry) => !removedIds.includes(entry.id)),
        async () => {
          const response = await sendBulk({
            action: "delete",
            ids: removedIds,
          });
          await release.tell(response, deletedToast);
        },
      );
    },
    moveMany: (ids, dueDate) => {
      const moving = rows.filter((row) => ids.includes(row.id) && isOpen(row));
      if (moving.length === 0) return;
      const changes = moving.map(({ id, startDate }) =>
        datesInOrder({ startDate, dueDate })
          ? { id, dueDate, ownerSet: true }
          : {
              id,
              dueDate,
              ownerSet: true,
              start: { date: null, ownerSet: true },
            },
      );
      const move = dueDatesMove(changes);
      run(
        withDueDates(
          changes.map((change) =>
            change.start
              ? { id: change.id, dueDate, startDate: null }
              : { id: change.id, dueDate },
          ),
        ),
        move.send,
      );
      const count = String(moving.length);
      showToast({
        message:
          dueDate === null
            ? copy.undatedMany.replace("{count}", count)
            : copy.movedMany
                .replace("{count}", count)
                .replace("{date}", formatListDay(dueDate, locale)),
        action: {
          label: copy.undo,
          onAction: () => {
            run(withDueDates(moving), move.undo);
          },
        },
      });
    },
  };
}
