"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import {
  addMinutes,
  formatLocalTime,
  instantOf,
  isLocalTimeText,
  localTimeAt,
  parseLocalTime,
} from "../calendar/ics/instant-of.ts";
import { slotIsAhead, type TodoItemData } from "./to-todo-item-data.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

const MINUTE = 60_000;
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const DEFAULT_DURATION = 60;
const SLOT_GRID_MINUTES = 30;
const LATER_START_HOUR = "09:00";

/** The next half hour, or the morning of the day that the to-do starts when that comes later. */
function firstOfferedStart(
  startDate: string | null,
  today: string,
  now: number,
  timeZone: string,
) {
  if (startDate !== null && startDate > today) {
    return `${startDate}T${LATER_START_HOUR}`;
  }
  const local = { ...localTimeAt(now, timeZone), second: 0 };
  return formatLocalTime(
    addMinutes(local, SLOT_GRID_MINUTES - (local.minute % SLOT_GRID_MINUTES)),
    true,
  );
}

function SlotForm({
  todo,
  onClose,
}: {
  todo: TodoItemData;
  onClose: () => void;
}) {
  const { setSlot, today, timeZone } = useTodoStore();
  const slot = todo.calendarSlot;
  const [start, setStart] = useState(() => {
    const now = Date.now();
    return slot && slotIsAhead(slot, now)
      ? formatLocalTime(localTimeAt(Date.parse(slot.start), timeZone), true)
      : firstOfferedStart(todo.startDate, today, now, timeZone);
  });
  const [duration, setDuration] = useState(
    slot
      ? (Date.parse(slot.end) - Date.parse(slot.start)) / MINUTE
      : DEFAULT_DURATION,
  );
  const [startError, setStartError] = useState("");
  const pickTime = t({ en: "Pick a time.", zh: "请选择时间。" });
  const passed = t({
    en: "That time has passed. Pick a later one.",
    zh: "这个时间已经过去了，请选择更晚的时间。",
  });
  const minutes = t({ en: "{count} min", zh: "{count} 分钟" });
  const hours = t({ en: "{count} h", zh: "{count} 小时" });

  return (
    <form
      noValidate
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        if (!isLocalTimeText(start, true)) {
          setStartError(pickTime);
          return;
        }
        const instant = instantOf(parseLocalTime(start), timeZone);
        if (instant <= Date.now()) {
          setStartError(passed);
          return;
        }
        setSlot(todo.id, {
          start: new Date(instant).toISOString(),
          end: new Date(instant + duration * MINUTE).toISOString(),
        });
        onClose();
      }}
    >
      <Text as="p" look="bodySmall" tone="muted">
        {todo.title}
      </Text>
      <TextField
        type="datetime-local"
        label={t({ en: "Starts", zh: "开始时间" })}
        value={start}
        error={startError || undefined}
        onChange={(event) => {
          setStart(event.target.value);
          setStartError("");
        }}
      />
      <Select
        label={t({ en: "How long", zh: "时长" })}
        value={String(duration)}
        options={[...new Set([...DURATIONS, duration])]
          .toSorted((a, b) => a - b)
          .map((option) => ({
            value: String(option),
            label:
              option % 60 === 0
                ? hours.replace("{count}", String(option / 60))
                : minutes.replace("{count}", String(option)),
          }))}
        onChange={(event) => {
          setDuration(Number(event.target.value));
        }}
      />
      <Text as="p" look="caption" tone="muted">
        {(slot
          ? t({
              en: "Time in {zone}. The event moves in your calendar.",
              zh: "时区：{zone}。日历上的日程会一起改。",
            })
          : t({
              en: "Time in {zone}. It goes into your default calendar. It comes off again if you finish or delete the to-do before then.",
              zh: "时区：{zone}。它会加入你的默认日历。如果你提前完成或删除这项待办，它会从日历上移除。",
            })
        ).replace("{zone}", timeZone)}
      </Text>
      <div css={styles.actions}>
        <Button type="submit" look="primary">
          {slot
            ? t({ en: "Move", zh: "改时间" })
            : t({ en: "Add to calendar", zh: "加入日历" })}
        </Button>
      </div>
    </form>
  );
}

/** Asks when a to-do takes place on the calendar, and for how long. */
export function CalendarSlotSheet({
  todo,
  isOpen,
  onClose,
}: {
  todo: TodoItemData;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      title={
        todo.calendarSlot
          ? t({ en: "Move on calendar", zh: "在日历上改时间" })
          : t({ en: "Add to calendar", zh: "加入日历" })
      }
    >
      <SlotForm todo={todo} onClose={onClose} />
    </Sheet>
  );
}

const styles = stylex.create({
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
});
