"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import {
  formatLocalTime,
  instantOf,
  localTimeAt,
  parseLocalTime,
} from "../calendar/ics/instant-of.ts";
import { datesInOrder } from "../report/dates-in-order.ts";
import { firstOccurrence, sameRepeatRule } from "../report/next-occurrence.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import {
  RepeatField,
  repeatDraftOf,
  ruleOfDraft,
  withYearDate,
} from "./repeat-field.tsx";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { TodoChecklist } from "./todo-checklist.tsx";
import type { TodoItemSortable } from "./todo-item.tsx";
import { useTodoStore, type TodoEdit } from "./todo-store-provider.tsx";

export type TodoEditFocus =
  "title" | "checklist" | "dueDate" | "startDate" | "remindAt" | "repeat";

function openDatePicker(field: HTMLInputElement) {
  try {
    field.showPicker();
  } catch {
    // Without a recent tap the browser refuses. The field has focus, which is enough.
  }
}

/** A date or a date and time, or none. It takes the focus and opens its picker when the menu asked for it. */
function DateField({
  type = "date",
  label,
  clearLabel,
  value,
  max,
  error,
  autoPick,
  onChange,
}: {
  type?: "date" | "datetime-local";
  label: string;
  clearLabel?: string;
  value: string;
  max?: string;
  error?: string;
  autoPick: boolean;
  onChange: (value: string) => void;
}) {
  const noDate = t({ en: "No date", zh: "不设日期" });

  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (autoPick && field) openDatePicker(field);
  }, [autoPick]);

  return (
    <div css={[cluster.tight, styles.dateRow]}>
      <TextField
        ref={fieldRef}
        type={type}
        label={label}
        value={value}
        max={max}
        error={error}
        autoFocus={autoPick}
        css={type === "date" ? styles.dateField : styles.dateTimeField}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {value ? (
        <Button
          type="button"
          size="sm"
          look="ghost"
          onClick={() => {
            onChange("");
          }}
        >
          {clearLabel ?? noDate}
        </Button>
      ) : null}
    </div>
  );
}

/** The row of a to-do while its title, detail and dates can change. */
export function TodoEditor({
  todo,
  focus,
  sortable,
  onClose,
}: {
  todo: TodoItemData;
  focus: TodoEditFocus;
  sortable?: TodoItemSortable;
  onClose: () => void;
}) {
  const { edit, remove, addStep, today, locale, timeZone } = useTodoStore();
  const savedRemindAt = todo.remindAt
    ? formatLocalTime(localTimeAt(Date.parse(todo.remindAt), timeZone), true)
    : "";
  const [title, setTitle] = useState(todo.title);
  const [detail, setDetail] = useState(todo.detail ?? "");
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [startDate, setStartDate] = useState(todo.startDate ?? "");
  const [remindAt, setRemindAt] = useState(savedRemindAt);
  const [repeat, setRepeat] = useState(() =>
    repeatDraftOf(todo.repeat, todo.dueDate ?? today),
  );
  const [newStep, setNewStep] = useState("");
  const [titleError, setTitleError] = useState("");
  const [repeatError, setRepeatError] = useState("");
  const [startError, setStartError] = useState("");
  const [remindError, setRemindError] = useState("");
  const titleRequired = t({ en: "Give it a title.", zh: "请填写标题。" });
  const startAfterDue = t({
    en: "It cannot start after it is due.",
    zh: "开始日期不能晚于到期日。",
  });
  const remindPassed = t({
    en: "That time has passed. Pick a later one.",
    zh: "这个时间已经过去了，请选择更晚的时间。",
  });
  const badInterval = t({
    en: "Give a whole number from 1 to {max}.",
    zh: "请填写 1 到 {max} 之间的整数。",
  }).replace("{max}", String(todoLimits.repeatInterval));

  function save() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitleError(titleRequired);
      return;
    }
    const nextDetail = detail.trim() || null;
    const nextRepeat = ruleOfDraft(repeat);
    if (nextRepeat === undefined) {
      setRepeatError(badInterval);
      return;
    }
    const nextDueDate =
      dueDate || (nextRepeat && firstOccurrence(nextRepeat, today));
    const nextStartDate = startDate || null;
    if (!datesInOrder({ startDate: nextStartDate, dueDate: nextDueDate })) {
      setStartError(startAfterDue);
      return;
    }
    const change: TodoEdit = {};
    if (remindAt !== savedRemindAt) {
      const instant = remindAt
        ? instantOf(parseLocalTime(remindAt), timeZone)
        : null;
      if (instant !== null && instant <= Date.now()) {
        setRemindError(remindPassed);
        return;
      }
      change.remindAt =
        instant === null ? null : new Date(instant).toISOString();
    }
    if (nextTitle !== todo.title) change.title = nextTitle;
    if (nextDetail !== todo.detail) change.detail = nextDetail;
    if (nextDueDate !== todo.dueDate) change.dueDate = nextDueDate;
    if (nextStartDate !== todo.startDate) change.startDate = nextStartDate;
    if (!sameRepeatRule(nextRepeat, todo.repeat)) change.repeat = nextRepeat;
    if (Object.keys(change).length > 0) edit(todo.id, change);
    if (newStep.trim()) addStep(todo.id, newStep.trim());
    onClose();
  }

  return (
    <li
      ref={sortable?.itemRef}
      data-todo-editor
      css={[listSurface.item, sortable?.itemCss]}
    >
      <form
        noValidate
        css={[listSurface.row, stack.item, styles.form]}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <TextField
          label={t({ en: "Title", zh: "标题" })}
          value={title}
          maxLength={todoLimits.titleChars}
          required
          autoFocus={focus === "title"}
          error={titleError || undefined}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError("");
          }}
        />
        <Textarea
          label={t({ en: "Detail", zh: "详情" })}
          value={detail}
          rows={2}
          maxLength={todoLimits.detailChars}
          onChange={(event) => {
            setDetail(event.target.value);
          }}
        />
        <TodoChecklist
          todoId={todo.id}
          steps={todo.checklist}
          takeFocus={focus === "checklist"}
          newStep={newStep}
          onNewStepChange={setNewStep}
        />
        <DateField
          label={t({ en: "Due date", zh: "到期日" })}
          value={dueDate}
          autoPick={focus === "dueDate"}
          onChange={(value) => {
            setDueDate(value);
            setStartError("");
            if (value) setRepeat(withYearDate(repeat, value));
          }}
        />
        <DateField
          label={t({ en: "Start date", zh: "开始日期" })}
          value={startDate}
          max={dueDate || undefined}
          error={startError || undefined}
          autoPick={focus === "startDate"}
          onChange={(value) => {
            setStartDate(value);
            setStartError("");
          }}
        />
        <div css={stack.tight}>
          <DateField
            type="datetime-local"
            label={t({ en: "Remind me", zh: "提醒我" })}
            clearLabel={t({ en: "No reminder", zh: "不提醒" })}
            value={remindAt}
            error={remindError || undefined}
            autoPick={focus === "remindAt"}
            onChange={(value) => {
              setRemindAt(value);
              setRemindError("");
            }}
          />
          <Text as="p" look="caption" tone="muted">
            {t({
              en: "Time in {zone}. It goes to each device with notifications on.",
              zh: "时区：{zone}。提醒会发到每台开启了通知的设备。",
            }).replace("{zone}", timeZone)}
          </Text>
        </div>
        <RepeatField
          draft={repeat}
          date={dueDate || today}
          autoFocus={focus === "repeat"}
          error={repeatError || undefined}
          locale={locale}
          onChange={(draft) => {
            setRepeat(draft);
            setRepeatError("");
          }}
        />
        <div css={cluster.tight}>
          <Text look="caption" tone="muted">
            {todo.createdBy === "owner"
              ? t({ en: "You added this", zh: "你添加的" })
              : t({ en: "From the morning report", zh: "来自晨报" })}
          </Text>
          {todo.openHref ? <OpenMailButton href={todo.openHref} /> : null}
        </div>
        <div css={[cluster.tight, styles.actions]}>
          <Button type="submit" size="sm" look="primary">
            {t({ en: "Save", zh: "保存" })}
          </Button>
          <Button type="button" size="sm" look="ghost" onClick={onClose}>
            {t({ en: "Cancel", zh: "取消" })}
          </Button>
          <Button
            type="button"
            size="sm"
            look="ghost"
            css={styles.delete}
            onClick={() => {
              onClose();
              remove(todo.id);
            }}
          >
            {t({ en: "Delete", zh: "删除" })}
          </Button>
        </div>
      </form>
    </li>
  );
}

const styles = stylex.create({
  form: {
    alignItems: "stretch",
    paddingBlock: space._3,
  },
  dateRow: {
    alignItems: "flex-end",
  },
  dateField: {
    inlineSize: "11rem",
  },
  dateTimeField: {
    inlineSize: "15rem",
  },
  actions: {
    justifyContent: "flex-start",
  },
  delete: {
    marginInlineStart: "auto",
  },
});
