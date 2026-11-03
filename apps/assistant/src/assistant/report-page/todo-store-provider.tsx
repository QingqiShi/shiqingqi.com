"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import {
  ToastProvider,
  useToast,
  type ToastOptions,
} from "@tuja/ui/components/toast-provider";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { datesInOrder } from "../report/dates-in-order.ts";
import type { RepeatRule } from "../report/next-occurrence.ts";
import {
  nextOccurrenceDates,
  nextOccurrenceReminder,
} from "../report/next-occurrence.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import type {
  DueDateChange,
  EarlierWaiting,
  OwnerTodoChange,
  WaitingChange,
} from "../report/owner-todos.ts";
import { rearrange } from "../report/rearrange.ts";
import type { SlotOutcome } from "../report/todo-calendar-slots.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";
import { formatListDay, formatSlotTime } from "./format-day.ts";
import { groupOf, viewOfTodo } from "./group-open-todos.ts";
import { RejectTodosSheet } from "./reject-todos-sheet.tsx";
import {
  isOpen,
  slotIsAhead,
  type CalendarSlot,
  type TodoItemData,
} from "./to-todo-item-data.ts";

export type TodoEdit = Omit<OwnerTodoChange, "done" | "nextId">;

type TodoRows = readonly TodoItemData[];

/** One change of the list. It runs again on newer rows, so it must not depend on where it first ran. */
type TodoOp = (rows: TodoRows) => TodoRows;

interface PendingOp {
  key: number;
  op: TodoOp;
}

interface TodoStore {
  rows: TodoRows;
  /** The user's local date, `YYYY-MM-DD`. */
  today: string;
  locale: string;
  /** The owner's time zone, which a reminder's time is read in. */
  timeZone: string;
  /** Every open to-do of the user, also those not on this page. */
  openCount: number;
  /** The owner has a calendar to put a to-do on. */
  hasCalendar: boolean;
  /** When the server began this render, in milliseconds. */
  renderedAt: number;
  add: (todo: { title: string; dueDate: string | null }) => void;
  edit: (id: string, edit: TodoEdit) => void;
  setDone: (id: string, done: boolean) => void;
  /** Moves a repeating to-do on to its next occurrence, and this one counts as neither done nor deleted. */
  skipOccurrence: (id: string) => void;
  remove: (id: string) => void;
  /** Makes a to-do wait, changes its wait or ends it. */
  setWaiting: (id: string, change: WaitingChange) => void;
  moveOverdueToToday: () => void;
  /** Closes these open to-dos with one request and one Undo. */
  closeMany: (ids: readonly string[]) => void;
  /** Deletes these to-dos with one request and one Undo. */
  removeMany: (ids: readonly string[]) => void;
  /** Gives these to-dos one due date with one request and one Undo. */
  moveMany: (ids: readonly string[], dueDate: string | null) => void;
  /** Puts these to-dos in this order, in the places that they hold. */
  reorder: (ids: readonly string[]) => void;
  addStep: (todoId: string, text: string) => void;
  changeStep: (
    todoId: string,
    stepId: string,
    change: Partial<Pick<ChecklistItem, "text" | "done">>,
  ) => void;
  removeStep: (todoId: string, stepId: string) => void;
  /** Puts these steps of a checklist in this order, in the places that they hold. */
  reorderSteps: (todoId: string, ids: readonly string[]) => void;
  /** Puts time for a to-do on the calendar, or moves the time it holds. */
  setSlot: (id: string, slot: CalendarSlot) => void;
  removeSlot: (id: string) => void;
}

const TodoStoreContext = createContext<TodoStore | null>(null);

export function useTodoStore() {
  const store = use(TodoStoreContext);
  if (!store) throw new Error("useTodoStore needs a TodoStoreProvider");
  return store;
}

function isOverdue(row: TodoItemData, today: string) {
  return isOpen(row) && groupOf(row, today) === "overdue";
}

function patchRow(id: string, patch: Partial<TodoItemData>): TodoOp {
  return (rows) =>
    rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function patchChecklist(
  todoId: string,
  change: (steps: readonly ChecklistItem[]) => readonly ChecklistItem[],
): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === todoId ? { ...row, checklist: change(row.checklist) } : row,
    );
}

function withTicks(
  steps: readonly ChecklistItem[],
  ticked: readonly string[],
): readonly ChecklistItem[] {
  return steps.map((step) => ({ ...step, done: ticked.includes(step.id) }));
}

function stepPath(todoId: string, stepId?: string) {
  const checklist = `/api/todos/${todoId}/checklist`;
  return stepId === undefined ? checklist : `${checklist}/${stepId}`;
}

/** A delete of a step, and its undo, which puts the step back where the server says it was. */
function stepRemoval(todoId: string, step: ChecklistItem) {
  let position: number | null = null;
  return {
    send: async () => {
      const response = await assistantFetch(stepPath(todoId, step.id), {
        method: "DELETE",
      });
      const body = (await response.json()) as { position: number };
      position = body.position;
    },
    undo: () =>
      position === null
        ? Promise.resolve()
        : assistantFetch(stepPath(todoId), {
            method: "POST",
            body: JSON.stringify({ ...step, position }),
          }),
  };
}

/** Closes a to-do, and adds its next occurrence where the row was, as the server does. */
function closeRow(
  id: string,
  next: TodoItemData | null,
  doneAt: string,
): TodoOp {
  return (rows) => {
    const shown = rows.some((row) => row.id === next?.id);
    return rows.flatMap((row) => {
      if (row.id !== id) return [row];
      const closed = {
        ...row,
        doneAt,
        nextId: next?.id ?? row.nextId,
        calendarSlot: slotIsAhead(row.calendarSlot, Date.parse(doneAt))
          ? null
          : row.calendarSlot,
      };
      return next && !shown ? [next, closed] : [closed];
    });
  };
}

/**
 * Opens a to-do again, as the server does: it takes the place of its next
 * occurrence that is still open, and it does not repeat when that one is done.
 * A next occurrence that this page does not hold says nothing. It also takes
 * the time that its next occurrence held on the calendar.
 */
function reopenRow(id: string): TodoOp {
  return (rows) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row) return rows;
    const next = rows.find((entry) => entry.id === row.nextId);
    const reopened = { ...row, doneAt: null, doneReason: null, nextId: null };
    return next && isOpen(next)
      ? rows
          .filter((entry) => entry.id !== id)
          .map((entry) =>
            entry.id === next.id
              ? {
                  ...reopened,
                  calendarSlot: next.calendarSlot ?? row.calendarSlot,
                }
              : entry,
          )
      : rows.map((entry) =>
          entry.id === id
            ? { ...reopened, repeat: next ? null : row.repeat }
            : entry,
        );
  };
}

/** The reminder of a row after a change of its time. A time that has passed goes out no more, as on the server. */
function reminderFields(remindAt: string | null) {
  return {
    remindAt,
    nextReminderAt:
      remindAt !== null && Date.parse(remindAt) > Date.now() ? remindAt : null,
  };
}

/** The dates and the reminder of the occurrence after this one. */
function nextOccurrenceFields(
  row: TodoItemData,
  rule: RepeatRule,
  today: string,
  timeZone: string,
) {
  const dates = nextOccurrenceDates(rule, row, today);
  return {
    ...dates,
    ...reminderFields(
      row.remindAt &&
        nextOccurrenceReminder(new Date(row.remindAt), {
          dueDate: row.dueDate,
          nextDueDate: dates.dueDate,
          timeZone,
        }).toISOString(),
    ),
  };
}

/** Taking the due date before the start date also takes the start date away. */
function withStartInOrder(row: TodoItemData | undefined, edit: TodoEdit) {
  return row &&
    edit.dueDate &&
    edit.startDate === undefined &&
    !datesInOrder({ startDate: row.startDate, dueDate: edit.dueDate })
    ? { ...edit, startDate: null }
    : edit;
}

function withDueDates(
  changes: readonly (Pick<TodoItemData, "id" | "dueDate"> &
    Partial<Pick<TodoItemData, "startDate">>)[],
): TodoOp {
  const dates = new Map(
    changes.map(({ id, dueDate, startDate }) => [
      id,
      startDate === undefined ? { dueDate } : { dueDate, startDate },
    ]),
  );
  return (rows) => rows.map((row) => ({ ...row, ...dates.get(row.id) }));
}

/** A wait after a change, as the server writes it. A new wait has nothing yet from the agent. */
function withWaiting(id: string, change: WaitingChange): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === id
        ? {
            ...row,
            ...change,
            waitingNote:
              row.waitingOn === change.waitingOn ? row.waitingNote : null,
          }
        : row,
    );
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

/** What became of the time that a change's to-dos held, when the change ended them. */
interface FreedSlot {
  id: string;
  outcome: SlotOutcome;
}

type WordedToast = ToastOptions & { message: string };

async function freedSlotsIn(response: Response) {
  if (response.status === 204) return [];
  const body = (await response.json()) as { calendar?: FreedSlot[] };
  return body.calendar ?? [];
}

function slotPath(id: string) {
  return `/api/todos/${id}/calendar`;
}

/** A request that puts time on the calendar. A retry sends the same name, so that it makes no second event. */
function slotAdd(id: string, time: CalendarSlot) {
  const name = crypto.randomUUID();
  return () =>
    assistantFetch(slotPath(id), {
      method: "POST",
      body: JSON.stringify({ name, time }),
    });
}

function inOrder(ops: readonly TodoOp[]): TodoOp {
  return (rows) => ops.reduce((list, op) => op(list), rows);
}

function sendBulk(body: object) {
  return assistantFetch("/api/todos/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
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

/**
 * Makes the function that shows a change at once and sends the requests one by
 * one, in the order of the changes. A refused change goes away, and the
 * changes after it stay. `onRefused` gets a way to try the change again.
 */
function createOpRunner(
  setPending: Dispatch<SetStateAction<readonly PendingOp[]>>,
  setConfirmed: Dispatch<SetStateAction<TodoRows>>,
  setSavedAt: Dispatch<SetStateAction<number>>,
) {
  let nextKey = 0;
  let queue = Promise.resolve();
  function runOp(
    op: TodoOp,
    request: () => Promise<unknown>,
    onSent: (save: Promise<unknown>) => void,
    onRefused: (error: unknown, retry: () => void) => void,
  ) {
    const key = nextKey;
    nextKey += 1;
    const settle = () => {
      setPending((list) => list.filter((entry) => entry.key !== key));
    };
    setPending((list) => [...list, { key, op }]);
    queue = queue.then(request).then(
      () => {
        setSavedAt(Date.now());
        setConfirmed((rows) => op(rows));
        settle();
      },
      (error: unknown) => {
        settle();
        onRefused(error, () => {
          runOp(op, request, onSent, onRefused);
        });
      },
    );
    onSent(queue);
  }
  return runOp;
}

function Store({
  todos,
  today,
  locale,
  timeZone,
  openCount,
  hasCalendar,
  renderedAt,
  refreshesOnLeave,
  children,
}: {
  todos: TodoRows;
  today: string;
  locale: string;
  timeZone: string;
  openCount: number;
  hasCalendar: boolean;
  renderedAt: number;
  refreshesOnLeave: boolean;
  children: ReactNode;
}) {
  const showToast = useToast();
  const router = useRouter();
  const [seenTodos, setSeenTodos] = useState(todos);
  const [confirmed, setConfirmed] = useState(todos);
  const [savedAt, setSavedAt] = useState(0);
  const [pending, setPending] = useState<readonly PendingOp[]>([]);
  const [runOp] = useState(() =>
    createOpRunner(setPending, setConfirmed, setSavedAt),
  );
  const lastSaveRef = useRef<Promise<unknown> | null>(null);
  const [rejecting, setRejecting] = useState<{
    rows: TodoRows;
    deletedToast: ToastOptions;
  } | null>(null);

  useEffect(
    () => () => {
      if (lastSaveRef.current === null) return;
      refreshAfterSave(lastSaveRef.current, () => {
        router.refresh();
      });
    },
    [router],
  );

  function clearCachedPagesAfter(save: Promise<unknown>) {
    if (refreshesOnLeave) {
      lastSaveRef.current = save;
      return;
    }
    refreshAfterSave(save, () => {
      router.refresh();
    });
  }

  // New rows from the server replace the list, and the changes that it does
  // not know of yet stay on top. A refresh that began before the last save can
  // land after it, and then its rows are older than the list. The clocks of the
  // server and the browser can differ, but then only a replacement comes late.
  if (seenTodos !== todos) {
    setSeenTodos(todos);
    if (renderedAt >= savedAt) setConfirmed(todos);
  }

  const copy = {
    failed: t({
      en: "That did not save, so it is back as it was.",
      zh: "没有保存成功，已恢复原样。",
    }),
    retry: t({ en: "Try again", zh: "重试" }),
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
    shouldNotBeAdded: t({
      en: "Should not have been added",
      zh: "不该添加",
    }),
    rejected: t({
      en: "Noted. The report will leave out this kind of to-do",
      zh: "记下了，晨报不会再添加这类待办",
    }),
    waitingOn: t({ en: "Waiting on {who}", zh: "正在等待：{who}" }),
    waitingOnUpcoming: t({
      en: "Waiting on {who}. It is in Upcoming now",
      zh: "正在等待：{who}。它现在在“接下来”里",
    }),
    notWaiting: t({ en: "Not waiting any more", zh: "不再等待" }),
    stepDeleted: t({ en: "Step deleted", zh: "已删除这一步" }),
    deletedSeries: t({
      en: "Deleted, and it will not repeat",
      zh: "已删除，不会再重复",
    }),
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
    slotAdded: t({
      en: "On your calendar: {time}",
      zh: "已加入日历：{time}",
    }),
    slotAddedTo: t({
      en: "On “{calendar}”: {time}",
      zh: "已加入“{calendar}”：{time}",
    }),
    slotMoved: t({
      en: "Moved on your calendar: {time}",
      zh: "已在日历上改到：{time}",
    }),
    slotRemoved: t({
      en: "Took {time} off your calendar",
      zh: "已从日历上移除 {time}",
    }),
    slotAdopted: t({
      en: "This now shows what your calendar holds",
      zh: "这里现在显示日历上的内容",
    }),
    slotChanged: t({
      en: "It changed in your calendar, so nothing was overwritten",
      zh: "它在日历里被改过，所以没有覆盖",
    }),
    useCalendarTime: t({ en: "Use the calendar's", zh: "以日历为准" }),
    slotGone: t({
      en: "That event is no longer on your calendar",
      zh: "这个日程已经不在日历上了",
    }),
    calendarSilent: t({
      en: "Your calendar did not answer, so nothing changed",
      zh: "日历没有响应，所以没有任何更改",
    }),
    noCalendar: t({
      en: "There is no calendar to add it to",
      zh: "没有可以添加到的日历",
    }),
    slotOver: t({ en: "That time has passed", zh: "这个时间已经过去了" }),
    afterFreed: t({ en: "{change}. {calendar}", zh: "{change}。{calendar}" }),
    slotFreed: t({
      en: "{time} is free on your calendar",
      zh: "日历上的 {time} 已空出",
    }),
    slotsFreed: t({
      en: "{count} times are free on your calendar",
      zh: "日历上的 {count} 段时间已空出",
    }),
    slotStays: t({
      en: "Your calendar did not answer, so {time} stays there until it does",
      zh: "日历没有响应，{time} 暂时还在日历上，稍后会再试",
    }),
    slotsStay: t({
      en: "Your calendar did not answer, so {count} times stay there until it does",
      zh: "日历没有响应，{count} 段时间暂时还在日历上，稍后会再试",
    }),
    slotKept: t({
      en: "{time} changed in your calendar, so it stays there as it is",
      zh: "{time} 在日历里被改过，所以保留原样",
    }),
    slotsKept: t({
      en: "{count} times changed in your calendar, so they stay there as they are",
      zh: "{count} 段时间在日历里被改过，所以保留原样",
    }),
  };

  function run(
    op: TodoOp,
    request: () => Promise<unknown>,
    refusalToast?: (error: unknown, retry: () => void) => ToastOptions,
  ) {
    runOp(op, request, clearCachedPagesAfter, (error, retry) => {
      showToast(
        refusalToast?.(error, retry) ?? {
          message: copy.failed,
          action: { label: copy.retry, onAction: retry },
        },
      );
    });
  }

  const slotText = (slot: CalendarSlot) =>
    formatSlotTime(slot, { today, locale, timeZone });

  function calendarRefusalToast(
    error: unknown,
    retry: () => void,
    takeCalendarTime?: () => void,
  ): ToastOptions {
    switch (error instanceof AssistantApiError ? error.code : null) {
      case "calendar-changed":
        return {
          message: copy.slotChanged,
          action: takeCalendarTime && {
            label: copy.useCalendarTime,
            onAction: takeCalendarTime,
          },
        };
      case "calendar-gone":
        return { message: copy.slotGone };
      case "no-calendar":
        return { message: copy.noCalendar };
      case "slot-over":
        return { message: copy.slotOver };
      case "calendar-unreachable":
        return {
          message: copy.calendarSilent,
          action: { label: copy.retry, onAction: retry },
        };
      default:
        return {
          message: copy.failed,
          action: { label: copy.retry, onAction: retry },
        };
    }
  }

  function takeCalendarTime(id: string) {
    run(
      (list) => list,
      async () => {
        await assistantFetch(slotPath(id), { method: "PATCH" });
        showToast({ message: copy.slotAdopted });
      },
      calendarRefusalToast,
    );
  }

  /** Puts time on the calendar when there is no `earlier`, moves `earlier` to it, or takes `earlier` off with no `slot`. */
  function writeSlot(
    id: string,
    slot: CalendarSlot | null,
    earlier: CalendarSlot | null,
    onSaved?: (response: Response) => Promise<void>,
  ) {
    const send = slot
      ? earlier
        ? () =>
            assistantFetch(slotPath(id), {
              method: "PUT",
              body: JSON.stringify(slot),
            })
        : slotAdd(id, slot)
      : () => assistantFetch(slotPath(id), { method: "DELETE" });
    run(
      patchRow(id, { calendarSlot: slot }),
      async () => {
        await onSaved?.(await send());
      },
      (error, retry) =>
        calendarRefusalToast(error, retry, () => {
          takeCalendarTime(id);
        }),
    );
  }

  /** `writeSlot` that then says what it did, with an Undo while the earlier state can come back. */
  function changeSlot(
    id: string,
    slot: CalendarSlot | null,
    earlier: CalendarSlot | null,
  ) {
    writeSlot(id, slot, earlier, async (response) => {
      let message = slot
        ? copy.slotMoved.replace("{time}", slotText(slot))
        : earlier
          ? copy.slotRemoved.replace("{time}", slotText(earlier))
          : "";
      if (slot && !earlier) {
        const { calendar } = (await response.json()) as {
          calendar: string | null;
        };
        message = calendar
          ? copy.slotAddedTo
              .replace("{calendar}", calendar)
              .replace("{time}", slotText(slot))
          : copy.slotAdded.replace("{time}", slotText(slot));
      }
      showToast({
        message,
        action:
          earlier === null || slotIsAhead(earlier, Date.now())
            ? {
                label: copy.undo,
                onAction: () => {
                  writeSlot(id, earlier, slot);
                },
              }
            : undefined,
      });
    });
  }

  /**
   * The time on the calendar of to-dos that a change ends. The server frees it
   * after it stores the change. `tell` says what became of it, in place of the
   * change's toast, and `addBack` puts back what was freed, for the Undo.
   */
  function slotRelease(held: TodoRows) {
    const ahead = held.flatMap(({ id, calendarSlot }) =>
      calendarSlot && slotIsAhead(calendarSlot, Date.now())
        ? [{ id, slot: calendarSlot }]
        : [],
    );
    let freed: readonly FreedSlot[] = [];
    let undone = false;
    const slotsWith = (outcome: SlotOutcome) =>
      ahead.filter(({ id }) =>
        freed.some((entry) => entry.id === id && entry.outcome === outcome),
      );
    return {
      tell: async (response: Response, change: WordedToast) => {
        freed = await freedSlotsIn(response);
        if (undone || freed.length === 0) return;
        const silent = slotsWith("unreachable");
        const kept = slotsWith("changed");
        const [slots, one, many] =
          silent.length > 0
            ? [silent, copy.slotStays, copy.slotsStay]
            : kept.length > 0
              ? [kept, copy.slotKept, copy.slotsKept]
              : [slotsWith("freed"), copy.slotFreed, copy.slotsFreed];
        if (slots.length === 0) return;
        const calendar =
          slots.length === 1
            ? one.replace("{time}", slotText(slots[0].slot))
            : many.replace("{count}", String(slots.length));
        showToast({
          ...change,
          message: copy.afterFreed
            .replace("{change}", change.message)
            .replace("{calendar}", calendar),
        });
      },
      addBack: () => {
        undone = true;
        for (const { id, slot } of ahead) {
          const send = slotAdd(id, slot);
          run(
            patchRow(id, { calendarSlot: slot }),
            () =>
              freed.some(
                (entry) => entry.id === id && entry.outcome === "freed",
              )
                ? send()
                : Promise.resolve(),
            calendarRefusalToast,
          );
        }
      },
    };
  }

  const rows = pending.reduce<TodoRows>((list, { op }) => op(list), confirmed);

  function showDeleted(removed: TodoRows, message: string, undo: () => void) {
    const fromReport = removed.filter((row) => row.createdBy === "report");
    const deletedToast: WordedToast = {
      message,
      action: { label: copy.undo, onAction: undo },
      secondAction:
        fromReport.length === 0
          ? undefined
          : {
              label: copy.shouldNotBeAdded,
              onAction: () => {
                setRejecting({ rows: fromReport, deletedToast });
              },
            },
    };
    showToast(deletedToast);
    return deletedToast;
  }

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

  function nextRowOf(
    row: TodoItemData,
  ): (TodoItemData & { dueDate: string }) | null {
    return row.repeat && isOpen(row)
      ? {
          ...row,
          ...nextOccurrenceFields(row, row.repeat, today, timeZone),
          id: crypto.randomUUID(),
          calendarSlot: null,
          checklist: withTicks(row.checklist, []),
          waitingOn: null,
          followUpDate: null,
          waitingNote: null,
          createdBy: "owner" as const,
          reAdded: false,
          openHref: null,
        }
      : null;
  }

  const store: TodoStore = {
    rows,
    today,
    locale,
    timeZone,
    openCount:
      openCount + rows.filter(isOpen).length - todos.filter(isOpen).length,
    hasCalendar,
    renderedAt,
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
      const next = row ? nextRowOf(row) : null;
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
        .map((row) => ({ id: row.id, next: nextRowOf(row) }));
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
    addStep: (todoId, text) => {
      const step = { id: crypto.randomUUID(), text, done: false };
      run(
        patchChecklist(todoId, (steps) =>
          steps.some((entry) => entry.id === step.id)
            ? steps
            : [...steps, step],
        ),
        () =>
          assistantFetch(stepPath(todoId), {
            method: "POST",
            body: JSON.stringify({ id: step.id, text }),
          }),
      );
    },
    changeStep: (todoId, stepId, change) => {
      run(
        patchChecklist(todoId, (steps) =>
          steps.map((step) =>
            step.id === stepId ? { ...step, ...change } : step,
          ),
        ),
        () =>
          assistantFetch(stepPath(todoId, stepId), {
            method: "PATCH",
            body: JSON.stringify(change),
          }),
      );
    },
    removeStep: (todoId, stepId) => {
      const steps = rows.find((row) => row.id === todoId)?.checklist ?? [];
      const index = steps.findIndex((step) => step.id === stepId);
      if (index === -1) return;
      const removal = stepRemoval(todoId, steps[index]);
      run(
        patchChecklist(todoId, (list) =>
          list.filter((step) => step.id !== stepId),
        ),
        removal.send,
      );
      showToast({
        message: copy.stepDeleted,
        action: {
          label: copy.undo,
          onAction: () => {
            run(
              patchChecklist(todoId, (list) =>
                list.some((step) => step.id === stepId)
                  ? list
                  : list.toSpliced(index, 0, steps[index]),
              ),
              removal.undo,
            );
          },
        },
      });
    },
    reorderSteps: (todoId, ids) => {
      run(
        patchChecklist(todoId, (steps) => rearrange(steps, ids)),
        () =>
          assistantFetch(`${stepPath(todoId)}order`, {
            method: "PUT",
            body: JSON.stringify({ ids }),
          }),
      );
    },
    setSlot: (id, slot) => {
      changeSlot(
        id,
        slot,
        rows.find((row) => row.id === id)?.calendarSlot ?? null,
      );
    },
    removeSlot: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row?.calendarSlot) return;
      if (isOpen(row)) {
        changeSlot(id, null, row.calendarSlot);
        return;
      }
      const message = copy.slotRemoved.replace(
        "{time}",
        slotText(row.calendarSlot),
      );
      writeSlot(id, null, row.calendarSlot, () => {
        showToast({ message });
        return Promise.resolve();
      });
    },
  };

  return (
    <TodoStoreContext value={store}>
      {children}
      <RejectTodosSheet
        rows={rejecting?.rows ?? null}
        onSave={(note) => {
          if (!rejecting) return;
          const ids = rejecting.rows.map((row) => row.id);
          setRejecting(null);
          run(
            (list) => list,
            () => sendBulk({ action: "reject", ids, note }),
          );
          showToast({
            message: copy.rejected,
            action: rejecting.deletedToast.action,
          });
        }}
        onCancel={() => {
          if (!rejecting) return;
          setRejecting(null);
          showToast(rejecting.deletedToast);
        }}
      />
    </TodoStoreContext>
  );
}

/**
 * Holds the to-dos of a page on the client: each change shows at once, is
 * sent to the server, and goes away with a message when the server refuses it.
 */
export function TodoStoreProvider({
  todos,
  today,
  locale,
  timeZone,
  openCount,
  hasCalendar = false,
  renderedAt,
  refreshesOnLeave = false,
  children,
}: {
  todos: readonly TodoItemData[];
  today: string;
  locale: string;
  timeZone: string;
  openCount: number;
  /** The owner has a calendar to put a to-do on. */
  hasCalendar?: boolean;
  /** When the server began this render, in milliseconds. */
  renderedAt: number;
  /** A refresh would replace what the page shows, so it waits until the owner leaves. */
  refreshesOnLeave?: boolean;
  children: ReactNode;
}) {
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      css={styles.toasts}
    >
      <Store
        todos={todos}
        today={today}
        locale={locale}
        timeZone={timeZone}
        openCount={openCount}
        hasCalendar={hasCalendar}
        renderedAt={renderedAt}
        refreshesOnLeave={refreshesOnLeave}
      >
        {children}
      </Store>
    </ToastProvider>
  );
}

const styles = stylex.create({
  toasts: {
    [toastTokens.clearance]: tabViewTokens.barClearance,
  },
});
