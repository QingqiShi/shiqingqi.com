"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { ToastProvider, useToast } from "@tuja/ui/components/toast-provider";
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
import { assistantFetch } from "../http/assistant-fetch.ts";
import { datesInOrder } from "../report/dates-in-order.ts";
import { nextOccurrenceDates } from "../report/next-occurrence.ts";
import type { DueDateChange, OwnerTodoChange } from "../report/owner-todos.ts";
import { rearrange } from "../report/rearrange.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";
import { formatListDay } from "./format-day.ts";
import { isOpen, type TodoItemData } from "./to-todo-item-data.ts";

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
  /** Every open to-do of the user, also those not on this page. */
  openCount: number;
  add: (todo: { title: string; dueDate: string | null }) => void;
  edit: (id: string, edit: TodoEdit) => void;
  setDone: (id: string, done: boolean) => void;
  /** Moves a repeating to-do on to its next occurrence, and this one counts as neither done nor deleted. */
  skipOccurrence: (id: string) => void;
  remove: (id: string) => void;
  moveOverdueToToday: () => void;
  /** Puts these to-dos in this order, in the places that they hold. */
  reorder: (ids: readonly string[]) => void;
}

const TodoStoreContext = createContext<TodoStore | null>(null);

export function useTodoStore() {
  const store = use(TodoStoreContext);
  if (!store) throw new Error("useTodoStore needs a TodoStoreProvider");
  return store;
}

function isOverdue(row: TodoItemData, today: string) {
  return isOpen(row) && row.dueDate !== null && row.dueDate < today;
}

function patchRow(id: string, patch: Partial<TodoItemData>): TodoOp {
  return (rows) =>
    rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
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
      const closed = { ...row, doneAt, nextId: next?.id ?? row.nextId };
      return next && !shown ? [next, closed] : [closed];
    });
  };
}

/**
 * Opens a to-do again, as the server does: it takes the place of its next
 * occurrence that is still open, and it does not repeat when that one is done.
 * A next occurrence that this page does not hold says nothing.
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
          .map((entry) => (entry.id === next.id ? reopened : entry))
      : rows.map((entry) =>
          entry.id === id
            ? { ...reopened, repeat: next ? null : row.repeat }
            : entry,
        );
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
  changes: readonly Pick<TodoItemData, "id" | "dueDate">[],
): TodoOp {
  const dates = new Map(changes.map((change) => [change.id, change.dueDate]));
  return (rows) =>
    rows.map((row) => {
      const dueDate = dates.get(row.id);
      return dueDate === undefined ? row : { ...row, dueDate };
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
    onRefused: (retry: () => void) => void,
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
      () => {
        settle();
        onRefused(() => {
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
  openCount,
  renderedAt,
  refreshesOnLeave,
  children,
}: {
  todos: TodoRows;
  today: string;
  locale: string;
  openCount: number;
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
    doneNext: t({
      en: "Done. Next one on {date}",
      zh: "已完成。下一次在 {date}",
    }),
    skipped: t({
      en: "Skipped. Next one on {date}",
      zh: "已跳过。下一次在 {date}",
    }),
    deleted: t({ en: "Deleted", zh: "已删除" }),
    deletedSeries: t({
      en: "Deleted, and it will not repeat",
      zh: "已删除，不会再重复",
    }),
    moved: t({ en: "Moved {count} to today", zh: "已把 {count} 项移到今天" }),
  };

  function run(op: TodoOp, request: () => Promise<unknown>) {
    runOp(op, request, clearCachedPagesAfter, (retry) => {
      showToast({
        message: copy.failed,
        action: { label: copy.retry, onAction: retry },
      });
    });
  }

  const rows = pending.reduce<TodoRows>((list, { op }) => op(list), confirmed);

  function sendTodoChange(id: string, op: TodoOp, change: OwnerTodoChange) {
    run(op, () =>
      assistantFetch(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(change),
      }),
    );
  }

  function reopen(id: string) {
    sendTodoChange(id, reopenRow(id), { done: false });
  }

  function sendOccurrence(
    id: string,
    dates: Pick<TodoItemData, "dueDate" | "startDate">,
  ) {
    run(patchRow(id, dates), () =>
      assistantFetch(`/api/todos/${id}/occurrence`, {
        method: "PUT",
        body: JSON.stringify(dates),
      }),
    );
  }

  const store: TodoStore = {
    rows,
    today,
    locale,
    openCount:
      openCount + rows.filter(isOpen).length - todos.filter(isOpen).length,
    add: ({ title, dueDate }) => {
      const id = crypto.randomUUID();
      const row: TodoItemData = {
        id,
        title,
        detail: null,
        dueDate,
        startDate: null,
        repeat: null,
        nextId: null,
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
        return;
      }
      const row = rows.find((entry) => entry.id === id);
      const next =
        row?.repeat && isOpen(row)
          ? {
              ...row,
              ...nextOccurrenceDates(row.repeat, row, today),
              id: crypto.randomUUID(),
              createdBy: "owner" as const,
              reAdded: false,
              openHref: null,
            }
          : null;
      sendTodoChange(id, closeRow(id, next, new Date().toISOString()), {
        done: true,
        nextId: next?.id,
      });
      showToast({
        message: next
          ? copy.doneNext.replace("{date}", formatListDay(next.dueDate, locale))
          : copy.done,
        action: {
          label: copy.undo,
          onAction: () => {
            reopen(id);
          },
        },
      });
    },
    skipOccurrence: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row?.repeat) return;
      const moved = nextOccurrenceDates(row.repeat, row, today);
      sendOccurrence(id, moved);
      showToast({
        message: copy.skipped.replace(
          "{date}",
          formatListDay(moved.dueDate, locale),
        ),
        action: {
          label: copy.undo,
          onAction: () => {
            sendOccurrence(id, {
              dueDate: row.dueDate,
              startDate: row.startDate,
            });
          },
        },
      });
    },
    remove: (id) => {
      const row = rows.find((entry) => entry.id === id);
      if (!row) return;
      const index = rows.indexOf(row);
      run(
        (list) => list.filter((entry) => entry.id !== id),
        () => assistantFetch(`/api/todos/${id}`, { method: "DELETE" }),
      );
      showToast({
        message: row.repeat && isOpen(row) ? copy.deletedSeries : copy.deleted,
        action: {
          label: copy.undo,
          onAction: () => {
            run(
              (list) =>
                list.some((entry) => entry.id === id)
                  ? list
                  : list.toSpliced(index, 0, row),
              () =>
                assistantFetch(`/api/todos/${id}/restore`, { method: "POST" }),
            );
          },
        },
      });
    },
    moveOverdueToToday: () => {
      const overdue = rows
        .filter((row) => isOverdue(row, today))
        .slice(0, todoLimits.dueDateChanges);
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

  return <TodoStoreContext value={store}>{children}</TodoStoreContext>;
}

/**
 * Holds the to-dos of a page on the client: each change shows at once, is
 * sent to the server, and goes away with a message when the server refuses it.
 */
export function TodoStoreProvider({
  todos,
  today,
  locale,
  openCount,
  renderedAt,
  refreshesOnLeave = false,
  children,
}: {
  todos: readonly TodoItemData[];
  today: string;
  locale: string;
  openCount: number;
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
        openCount={openCount}
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
