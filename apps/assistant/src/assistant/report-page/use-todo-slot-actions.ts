import { t } from "@tuja/i18n";
import {
  useToast,
  type ToastOptions,
} from "@tuja/ui/components/toast-provider";
import { AssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { formatSlotTime } from "./format-day.ts";
import { patchRow, type TodoRows } from "./patch-row.ts";
import { isOpen, slotIsAhead, type CalendarSlot } from "./to-todo-item-data.ts";
import type { TodoStore, WordedToast } from "./todo-store-provider.tsx";
import type { RunTodoOp } from "./use-optimistic-todos.ts";

/** The to-dos whose event a close or a delete took off the calendar. */
async function freedSlotsIn(response: Response) {
  if (response.status === 204) return [];
  const body = (await response.json()) as { freed?: string[] };
  return body.freed ?? [];
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

export function useTodoSlotActions({
  rows,
  run,
  today,
  locale,
  timeZone,
}: {
  rows: TodoRows;
  run: RunTodoOp;
  today: string;
  locale: string;
  timeZone: string;
}) {
  const showToast = useToast();
  const copy = {
    failed: t({
      en: "That did not save, so it is back as it was.",
      zh: "没有保存成功，已恢复原样。",
    }),
    retry: t({ en: "Try again", zh: "重试" }),
    undo: t({ en: "Undo", zh: "撤销" }),
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
    useCalendarTime: t({ en: "Use the calendar’s", zh: "以日历为准" }),
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
    closeSilent: t({
      en: "Your calendar did not answer, so the to-do is still open. Try again later.",
      zh: "日历没有响应，待办没有关闭，请稍后再试。",
    }),
    deleteSilent: t({
      en: "Your calendar did not answer, so the to-do was not deleted. Try again later.",
      zh: "日历没有响应，待办没有删除，请稍后再试。",
    }),
    reconnectCalendar: t({
      en: "Reconnect your calendar first: the to-do holds time on it.",
      zh: "请重新连接日历：这个待办在日历上占着时间。",
    }),
  };

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
   * with the change, or refuses the change. `tell` says what was freed, in place
   * of the change's toast, `addBack` puts it back, for the Undo, and
   * `refusalToast` says why the change did not happen.
   */
  function slotRelease(held: TodoRows, change: "close" | "delete") {
    const ahead = held.flatMap(({ id, calendarSlot }) =>
      calendarSlot && slotIsAhead(calendarSlot, Date.now())
        ? [{ id, slot: calendarSlot }]
        : [],
    );
    let freed: readonly string[] = [];
    let undone = false;
    return {
      tell: async (response: Response, worded: WordedToast) => {
        freed = await freedSlotsIn(response);
        const slots = ahead.filter(({ id }) => freed.includes(id));
        if (undone || slots.length === 0) return;
        const calendar =
          slots.length === 1
            ? copy.slotFreed.replace("{time}", slotText(slots[0].slot))
            : copy.slotsFreed.replace("{count}", String(slots.length));
        showToast({
          ...worded,
          message: copy.afterFreed
            .replace("{change}", worded.message)
            .replace("{calendar}", calendar),
        });
      },
      addBack: () => {
        undone = true;
        for (const { id, slot } of ahead) {
          const send = slotAdd(id, slot);
          run(
            patchRow(id, { calendarSlot: slot }),
            () => (freed.includes(id) ? send() : Promise.resolve()),
            calendarRefusalToast,
          );
        }
      },
      refusalToast: (error: unknown, retry: () => void): ToastOptions => {
        switch (error instanceof AssistantApiError ? error.code : null) {
          case "calendar-unreachable":
            return {
              message:
                change === "close" ? copy.closeSilent : copy.deleteSilent,
              action: { label: copy.retry, onAction: retry },
            };
          case "calendar-disconnected":
            return { message: copy.reconnectCalendar };
          default:
            return {
              message: copy.failed,
              action: { label: copy.retry, onAction: retry },
            };
        }
      },
    };
  }

  const actions: Pick<TodoStore, "setSlot" | "removeSlot"> = {
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
  return { ...actions, slotRelease };
}

export type ReleaseSlots = ReturnType<typeof useTodoSlotActions>["slotRelease"];
