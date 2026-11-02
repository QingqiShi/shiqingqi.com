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
import { todoLimits } from "../report/todo-limits.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { useTodoStore, type TodoEdit } from "./todo-store-provider.tsx";

export type TodoEditFocus = "title" | "dueDate";

function openDatePicker(field: HTMLInputElement) {
  try {
    field.showPicker();
  } catch {
    // Without a recent tap the browser refuses. The field has focus, which is enough.
  }
}

/** The row of a to-do while its title, detail and due date can change. */
export function TodoEditor({
  todo,
  focus,
  onClose,
}: {
  todo: TodoItemData;
  focus: TodoEditFocus;
  onClose: () => void;
}) {
  const { edit, remove } = useTodoStore();
  const [title, setTitle] = useState(todo.title);
  const [detail, setDetail] = useState(todo.detail ?? "");
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [titleError, setTitleError] = useState("");
  const dueDateRef = useRef<HTMLInputElement>(null);
  const titleRequired = t({ en: "Give it a title.", zh: "请填写标题。" });

  useEffect(() => {
    const field = dueDateRef.current;
    if (focus === "dueDate" && field) openDatePicker(field);
  }, [focus]);

  function save() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitleError(titleRequired);
      return;
    }
    const nextDetail = detail.trim() || null;
    const nextDueDate = dueDate || null;
    const change: TodoEdit = {};
    if (nextTitle !== todo.title) change.title = nextTitle;
    if (nextDetail !== todo.detail) change.detail = nextDetail;
    if (nextDueDate !== todo.dueDate) change.dueDate = nextDueDate;
    if (Object.keys(change).length > 0) edit(todo.id, change);
    onClose();
  }

  return (
    <li css={listSurface.item}>
      <form
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
        <div css={[cluster.tight, styles.dueRow]}>
          <TextField
            ref={dueDateRef}
            type="date"
            label={t({ en: "Due date", zh: "到期日" })}
            value={dueDate}
            autoFocus={focus === "dueDate"}
            css={styles.dueField}
            onChange={(event) => {
              setDueDate(event.target.value);
            }}
          />
          {dueDate ? (
            <Button
              type="button"
              size="sm"
              look="ghost"
              onClick={() => {
                setDueDate("");
              }}
            >
              {t({ en: "No date", zh: "不设日期" })}
            </Button>
          ) : null}
        </div>
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
  dueRow: {
    alignItems: "flex-end",
  },
  dueField: {
    inlineSize: "11rem",
  },
  actions: {
    justifyContent: "flex-start",
  },
  delete: {
    marginInlineStart: "auto",
  },
});
