"use client";

import { t } from "@tuja/i18n";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { OpenTodoGroups } from "./open-todo-groups.tsx";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The page of to-dos: the input, the open ones by when they are due, and the done ones. */
export function TodoBoard() {
  const { rows } = useTodoStore();
  const open = rows.filter(isOpen);
  const done = rows
    .filter((row) => !isOpen(row))
    .toSorted((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return (
    <div css={stack.group}>
      <header css={stack.text}>
        <Heading level={1} look="h3">
          {t({ en: "To-dos", zh: "待办" })}
        </Heading>
        {open.length > 0 ? (
          <Text as="p" look="bodySmall" tone="muted">
            {t({ en: "{count} open", zh: "{count} 项未完成" }).replace(
              "{count}",
              String(open.length),
            )}
          </Text>
        ) : null}
      </header>
      <OpenTodoGroups headingLevel={2} />
      {done.length > 0 ? (
        <Disclosure
          look="plain"
          summary={t({
            en: "Done ({count})",
            zh: "已完成（{count}）",
          }).replace("{count}", String(done.length))}
        >
          <TodoList ids={done.map((todo) => todo.id)} showSource />
        </Disclosure>
      ) : null}
    </div>
  );
}
