"use client";

import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The done to-dos of a page of the archive, newest first, each with its day. */
export function DoneArchive() {
  const { rows } = useTodoStore();
  const done = rows
    .flatMap(({ id, doneAt }) => (doneAt === null ? [] : [{ id, doneAt }]))
    .toSorted((a, b) => b.doneAt.localeCompare(a.doneAt));

  if (done.length === 0) {
    return (
      <Text as="p" tone="muted">
        {t({ en: "Nothing is done yet.", zh: "还没有完成的待办。" })}
      </Text>
    );
  }
  return <TodoList ids={done.map(({ id }) => id)} showSource showDoneDate />;
}
