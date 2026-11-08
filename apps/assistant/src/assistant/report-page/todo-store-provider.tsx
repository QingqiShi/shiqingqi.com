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
import { createContext, use, useState, type ReactNode } from "react";
import type { WaitingChange } from "../report/change-waiting.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import type { OwnerTodoChange } from "../report/owner-todos.ts";
import type { TodoRows } from "./patch-row.ts";
import { RejectTodosSheet } from "./reject-todos-sheet.tsx";
import { sendBulk } from "./send-bulk.ts";
import {
  isOpen,
  type CalendarSlot,
  type TodoItemData,
} from "./to-todo-item-data.ts";
import { useOptimisticTodos } from "./use-optimistic-todos.ts";
import { useTodoBulkActions } from "./use-todo-bulk-actions.ts";
import { useTodoRowActions } from "./use-todo-row-actions.ts";
import { useTodoSlotActions } from "./use-todo-slot-actions.ts";
import { useTodoStepActions } from "./use-todo-step-actions.ts";

export type TodoEdit = Omit<OwnerTodoChange, "done" | "nextId">;

export interface TodoStore {
  rows: TodoRows;
  /** The user's local date, `YYYY-MM-DD`. */
  today: string;
  locale: string;
  /** The owner's time zone, which the times of the page are read in. */
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

export type WordedToast = ToastOptions & { message: string };

export type ShowDeleted = (
  removed: TodoRows,
  message: string,
  undo: () => void,
) => WordedToast;

const TodoStoreContext = createContext<TodoStore | null>(null);

export function useTodoStore() {
  const store = use(TodoStoreContext);
  if (!store) throw new Error("useTodoStore needs a TodoStoreProvider");
  return store;
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
  const { rows, run } = useOptimisticTodos({
    todos,
    renderedAt,
    refreshesOnLeave,
  });
  const [rejecting, setRejecting] = useState<{
    rows: TodoRows;
    deletedToast: ToastOptions;
  } | null>(null);

  const copy = {
    undo: t({ en: "Undo", zh: "撤销" }),
    shouldNotBeAdded: t({
      en: "Should not have been added",
      zh: "不该添加",
    }),
    rejected: t({
      en: "Noted. The report will leave out this kind of to-do",
      zh: "记下了，晨报不会再添加这类待办",
    }),
  };

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

  const { slotRelease, setSlot, removeSlot } = useTodoSlotActions({
    rows,
    run,
    today,
    locale,
    timeZone,
  });
  const rowActions = useTodoRowActions({
    rows,
    run,
    today,
    locale,
    slotRelease,
    showDeleted,
  });
  const bulkActions = useTodoBulkActions({
    rows,
    run,
    today,
    locale,
    slotRelease,
    showDeleted,
  });
  const stepActions = useTodoStepActions({ rows, run });

  const store: TodoStore = {
    rows,
    today,
    locale,
    timeZone,
    openCount:
      openCount + rows.filter(isOpen).length - todos.filter(isOpen).length,
    hasCalendar,
    renderedAt,
    ...rowActions,
    ...bulkActions,
    ...stepActions,
    setSlot,
    removeSlot,
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
