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
import {
  closeRow,
  nextOccurrenceFields,
  nextRowOf,
  reminderFields,
  reopenRow,
  withTicks,
} from "./close-row.ts";
import { formatListDay } from "./format-day.ts";
import { viewOfTodo } from "./group-open-todos.ts";
import {
  patchChecklist,
  patchRow,
  withWaiting,
  type TodoOp,
  type TodoRows,
} from "./patch-row.ts";
import { isOpen, type TodoItemData } from "./to-todo-item-data.ts";
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
  locale,
  timeZone,
  slotRelease,
  showDeleted,
}: {
  rows: TodoRows;
  run: RunTodoOp;
  today: string;
  locale: string;
  timeZone: string;
  slotRelease: ReleaseSlots;
  showDeleted: ShowDeleted;
}): Pick<
  TodoStore,
  | "add"
  | "edit"
  | "setDone"
  | "skipOccurrence"
  | "remove"
  | "setWaiting"
  | "reorder"
> {
  const showToast = useToast();
  const copy = {
    undo: t({ en: "Undo", zh: "撤销" }),
    done: t({ en: "Done", zh: "已完成" }),
    reopened: t({
      en: "Reopened. It is back in your list",
      zh: "已重新打开，回到了待办列表",
    }),
    doneNext: t({
      en: "Done. Next one on {date}",
      zh: "已完成。下一次在 {date}",
    }),
    skipped: t({
      en: "Skipped. Next one on {date}",
      zh: "已跳过。下一次在 {date}",
    }),
    deleted: t({ en: "Deleted", zh: "已删除" }),
    waitingOn: t({ en: "Waiting on {who}", zh: "正在等待：{who}" }),
    waitingOnUpcoming: t({
      en: "Waiting on {who}. It is in Upcoming now",
      zh: "正在等待：{who}。它现在在“接下来”里",
    }),
    notWaiting: t({ en: "Not waiting any more", zh: "不再等待" }),
    deletedSeries: t({
      en: "Deleted, and it will not repeat",
      zh: "已删除，不会再重复",
    }),
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

  function sendOccurrence(
    id: string,
    fields: Pick<
      TodoItemData,
      "dueDate" | "startDate" | "remindAt" | "nextReminderAt" | "calendarSlot"
    >,
    ticked: readonly string[],
    onAnswer?: (response: Response) => Promise<void>,
  ) {
    const { dueDate, startDate, remindAt } = fields;
    const patchDates = patchRow(id, fields);
    const patchTicks = patchChecklist(id, (steps) => withTicks(steps, ticked));
    run(
      (list) => patchTicks(patchDates(list)),
      async () => {
        const response = await assistantFetch(`/api/todos/${id}/occurrence`, {
          method: "PUT",
          body: JSON.stringify({
            dueDate,
            startDate,
            remindAt: remindAt ?? undefined,
            ticked,
          }),
        });
        await onAnswer?.(response);
      },
    );
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
        repeat: null,
        remindAt: null,
        nextReminderAt: null,
        calendarSlot: null,
        nextId: null,
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
      sendTodoChange(
        id,
        patchRow(id, {
          ...change,
          ...(change.remindAt === undefined
            ? {}
            : reminderFields(change.remindAt)),
        }),
        change,
      );
    },
    setDone: (id, done) => {
      if (!done) {
        reopen(id);
        showToast({ message: copy.reopened });
        return;
      }
      const row = rows.find((entry) => entry.id === id);
      const next = row ? nextRowOf(row, today, timeZone) : null;
      const release = slotRelease(row ? [row] : []);
      const closedToast: WordedToast = {
        message: next
          ? copy.doneNext.replace("{date}", formatListDay(next.dueDate, locale))
          : copy.done,
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
        closeRow(id, next, new Date().toISOString()),
        { done: true, nextId: next?.id },
        (response) => release.tell(response, closedToast),
      );
      showToast(closedToast);
    },
    skipOccurrence: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row?.repeat) return;
      const moved = nextOccurrenceFields(row, row.repeat, today, timeZone);
      const release = slotRelease([row]);
      const skippedToast: WordedToast = {
        message: copy.skipped.replace(
          "{date}",
          formatListDay(moved.dueDate, locale),
        ),
        action: {
          label: copy.undo,
          onAction: () => {
            sendOccurrence(
              id,
              {
                dueDate: row.dueDate,
                startDate: row.startDate,
                remindAt: row.remindAt,
                nextReminderAt: row.nextReminderAt,
                calendarSlot: null,
              },
              row.checklist.filter((step) => step.done).map((step) => step.id),
            );
            release.addBack();
          },
        },
      };
      sendOccurrence(id, { ...moved, calendarSlot: null }, [], (response) =>
        release.tell(response, skippedToast),
      );
      showToast(skippedToast);
    },
    remove: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row) return;
      const index = rows.indexOf(row);
      const release = slotRelease([row]);
      const deletedToast = showDeleted(
        [row],
        row.repeat && isOpen(row) ? copy.deletedSeries : copy.deleted,
        () => {
          run(
            (list) =>
              list.some((entry) => entry.id === id)
                ? list
                : list.toSpliced(index, 0, row),
            () =>
              assistantFetch(`/api/todos/${id}/restore`, { method: "POST" }),
          );
          release.addBack();
        },
      );
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
