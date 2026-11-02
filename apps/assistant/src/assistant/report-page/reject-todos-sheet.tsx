"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { todoLimits } from "../report/todo-limits.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";

/** Asks for a short note on the deleted to-dos that the report should not have added. */
export function RejectTodosSheet({
  rows,
  onSave,
  onCancel,
}: {
  /** The deleted to-dos of the report's; null while the sheet is closed. */
  rows: readonly TodoItemData[] | null;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      isOpen={rows !== null}
      onClose={onCancel}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      title={t({ en: "Should not have been added", zh: "不该添加" })}
    >
      {rows ? <RejectForm rows={rows} onSave={onSave} /> : null}
    </Sheet>
  );
}

function RejectForm({
  rows,
  onSave,
}: {
  rows: readonly TodoItemData[];
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const one = t({
    en: "The morning report will leave out to-dos like “{title}”.",
    zh: "晨报之后不会再添加类似“{title}”的待办。",
  });
  const many = t({
    en: "The morning report added {count} of these. It will leave out to-dos like them.",
    zh: "其中 {count} 项是晨报添加的。晨报之后不会再添加类似的待办。",
  });

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(note);
      }}
    >
      <Text as="p" look="bodySmall" tone="muted">
        {rows.length === 1
          ? one.replace("{title}", rows[0].title)
          : many.replace("{count}", String(rows.length))}
      </Text>
      <TextField
        label={t({ en: "Why? (optional)", zh: "为什么？（可不填）" })}
        maxLength={todoLimits.rejectionNoteChars}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
        }}
      />
      <div css={styles.actions}>
        <Button type="submit" look="primary">
          {t({ en: "Tell the report", zh: "告诉晨报" })}
        </Button>
      </div>
    </form>
  );
}

const styles = stylex.create({
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
});
