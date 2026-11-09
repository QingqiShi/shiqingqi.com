import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { assistantFetch } from "../http/assistant-fetch.ts";
import type {
  EarlierWaiting,
  WaitingChange,
} from "../report/change-waiting.ts";
import { datesInOrder } from "../report/dates-in-order.ts";
import type { OwnerTodoChange } from "../report/owner-todos.ts";
import { rearrange } from "../report/rearrange.ts";
import { closeRow, reopenRow } from "./close-row.ts";
import { viewOfTodo } from "./group-open-todos.ts";
import {
  patchRow,
  withWaiting,
  type TodoOp,
  type TodoRows,
} from "./patch-row.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";
import type {
  ShowDeleted,
  TodoEdit,
  TodoStore,
  WordedToast,
} from "./todo-store-provider.tsx";
import type { RunTodoOp } from "./use-optimistic-todos.ts";
import type { ReleaseSlots } from "./use-todo-slot-actions.ts";

/** Taking the due date before the start date also takes the start date away. */
function withStartInOrder(row: TodoItemData | undefined, edit: TodoEdit) {
  return row &&
    edit.dueDate &&
    edit.startDate === undefined &&
    !datesInOrder({ startDate: row.startDate, dueDate: edit.dueDate })
    ? { ...edit, startDate: null }
    : edit;
}

/** A change of a wait, and its undo. A change that the server refused needs no undo. */
function waitingMove(id: string, change: WaitingChange) {
  const send = (body: object) =>
    assistantFetch(`/api/todos/${id}/waiting`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  let earlier: EarlierWaiting | null = null;
  return {
    send: async () => {
      const response = await send(change);
      const body = (await response.json()) as { earlier: EarlierWaiting };
      earlier = body.earlier;
    },
    undo: () => (earlier ? send({ restore: earlier }) : Promise.resolve()),
  };
}

export function useTodoRowActions({
  rows,
  run,
  today,
  slotRelease,
  showDeleted,
}: {
  rows: TodoRows;
  run: RunTodoOp;
  today: string;
  slotRelease: ReleaseSlots;
  showDeleted: ShowDeleted;
}): Pick<
  TodoStore,
  "add" | "edit" | "setDone" | "remove" | "setWaiting" | "reorder"
> {
  const showToast = useToast();
  const copy = {
    undo: t({ en: "Undo", zh: "撤销" }),
    done: t({ en: "Done", zh: "已完成" }),
    reopened: t({
      en: "Reopened. It is back in your list",
      zh: "已重新打开，回到了待办列表",
    }),
    deleted: t({ en: "Deleted", zh: "已删除" }),
    waitingOn: t({ en: "Waiting on {who}", zh: "正在等待：{who}" }),
    waitingOnUpcoming: t({
      en: "Waiting on {who}. It is in Upcoming now",
      zh: "正在等待：{who}。它现在在“接下来”里",
    }),
    notWaiting: t({ en: "Not waiting any more", zh: "不再等待" }),
  };

  function sendTodoChange(
    id: string,
    op: TodoOp,
    change: OwnerTodoChange,
    onAnswer?: (response: Response) => Promise<void>,
  ) {
    run(op, async () => {
      const response = await assistantFetch(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(change),
      });
      await onAnswer?.(response);
    });
  }

  function reopen(id: string) {
    sendTodoChange(id, reopenRow(id), { done: false });
  }

  return {
    add: ({ title, dueDate }) => {
      const id = crypto.randomUUID();
      const row: TodoItemData = {
        id,
        title,
        detail: null,
        dueDate,
        startDate: null,
        calendarSlot: null,
        waitingOn: null,
        followUpDate: null,
        waitingNote: null,
        checklist: [],
        createdBy: "owner",
        doneAt: null,
        doneReason: null,
        reAdded: false,
        openHref: null,
      };
      run(
        (list) =>
          list.some((entry) => entry.id === id) ? list : [...list, row],
        () =>
          assistantFetch("/api/todos", {
            method: "POST",
            body: JSON.stringify({ id, title, dueDate }),
          }),
      );
    },
    edit: (id, edit) => {
      const change = withStartInOrder(
        rows.find((row) => row.id === id),
        edit,
      );
      sendTodoChange(id, patchRow(id, change), change);
    },
    setDone: (id, done) => {
      if (!done) {
        reopen(id);
        showToast({ message: copy.reopened });
        return;
      }
      const row = rows.find((entry) => entry.id === id);
      const release = slotRelease(row ? [row] : []);
      const closedToast: WordedToast = {
        message: copy.done,
        action: {
          label: copy.undo,
          onAction: () => {
            reopen(id);
            release.addBack();
          },
        },
      };
      sendTodoChange(
        id,
        closeRow(id, new Date().toISOString()),
        { done: true },
        (response) => release.tell(response, closedToast),
      );
      showToast(closedToast);
    },
    remove: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row) return;
      const index = rows.indexOf(row);
      const release = slotRelease([row]);
      const deletedToast = showDeleted([row], copy.deleted, () => {
        run(
          (list) =>
            list.some((entry) => entry.id === id)
              ? list
              : list.toSpliced(index, 0, row),
          () => assistantFetch(`/api/todos/${id}/restore`, { method: "POST" }),
        );
        release.addBack();
      });
      run(
        (list) => list.filter((entry) => entry.id !== id),
        async () => {
          const response = await assistantFetch(`/api/todos/${id}`, {
            method: "DELETE",
          });
          await release.tell(response, deletedToast);
        },
      );
    },
    setWaiting: (id, change) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row) return;
      const move = waitingMove(id, change);
      run(withWaiting(id, change), move.send);
      if (row.waitingOn === change.waitingOn) return;
      const moved =
        viewOfTodo(row, today) === "today" &&
        viewOfTodo({ ...row, ...change }, today) === "upcoming";
      showToast({
        message:
          change.waitingOn === null
            ? copy.notWaiting
            : (moved ? copy.waitingOnUpcoming : copy.waitingOn).replace(
                "{who}",
                change.waitingOn,
              ),
        action: {
          label: copy.undo,
          onAction: () => {
            run(
              patchRow(id, {
                waitingOn: row.waitingOn,
                followUpDate: row.followUpDate,
                waitingNote: row.waitingNote,
              }),
              move.undo,
            );
          },
        },
      });
    },
    reorder: (ids) => {
      run(
        (list) => rearrange(list, ids),
        () =>
          assistantFetch("/api/todos/order", {
            method: "PUT",
            body: JSON.stringify({ ids }),
          }),
      );
    },
  };
}
