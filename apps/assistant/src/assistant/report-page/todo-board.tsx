"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DayHeader } from "../shell/day-header.tsx";
import { OpenTodoGroups } from "./open-todo-groups.tsx";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoList } from "./todo-list.tsx";
import { TodoSelectionArea } from "./todo-selection-area.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The input, the open to-dos of a view by when they matter, the last ones done, and the way to the rest. */
export function TodoBoard({ sharedText }: { sharedText: string }) {
  const { rows } = useTodoStore();
  const locale = useLocale();
  const done = rows
    .filter((row) => !isOpen(row))
    .toSorted((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));

  return (
    <TodoSelectionArea canAdd canSearch>
      <OpenTodoGroups headingLevel={2} sharedText={sharedText} />
      {done.length > 0 ? (
        <section css={stack.tight}>
          <DayHeader
            level={2}
            trailing={
              <Button
                href={getLocalePath("/todos/done", locale)}
                look="ghost"
                size="sm"
              >
                {t({ en: "See all", zh: "查看全部" })}
              </Button>
            }
          >
            {t({ en: "Recently done", zh: "最近完成" })}
          </DayHeader>
          <TodoList ids={done.map((todo) => todo.id)} showSource showDoneDate />
        </section>
      ) : null}
    </TodoSelectionArea>
  );
}
