"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { DayHeader } from "../shell/day-header.tsx";
import { OpenTodoGroups } from "./open-todo-groups.tsx";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The input, the open to-dos of a view by when they matter, the last ones done, and the way to the rest. */
export function TodoBoard() {
  const { rows } = useTodoStore();
  const locale = useLocale();
  const done = rows
    .filter((row) => !isOpen(row))
    .toSorted((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <>
      <OpenTodoGroups headingLevel={2} />
      {done.length > 0 ? (
        <section css={stack.tight}>
          <DayHeader
            level={2}
            trailing={
              <AnchorButton
                href={getLocalePath("/todos/done", locale)}
                look="ghost"
                size="sm"
              >
                {t({ en: "See all", zh: "查看全部" })}
              </AnchorButton>
            }
          >
            {t({ en: "Recently done", zh: "最近完成" })}
          </DayHeader>
          <TodoList ids={done.map((todo) => todo.id)} showSource showDoneDate />
        </section>
      ) : null}
    </>
  );
}
