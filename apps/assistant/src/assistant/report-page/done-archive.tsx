"use client";

import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DayHeader } from "../shell/day-header.tsx";
import { formatDay } from "./format-day.ts";
import { groupDoneTodos } from "./group-done-todos.ts";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The done to-dos of a page of the archive, by the day they were done. */
export function DoneArchive() {
  const { rows, locale, timeZone } = useTodoStore();
  const days = groupDoneTodos(
    rows.flatMap(({ id, doneAt }) => (doneAt === null ? [] : [{ id, doneAt }])),
    timeZone,
  );

  if (days.length === 0) {
    return (
      <Text as="p" tone="muted">
        {t({ en: "Nothing is done yet.", zh: "还没有完成的待办。" })}
      </Text>
    );
  }
  return days.map(({ date, ids }) => (
    <section key={date} css={stack.tight}>
      <DayHeader level={2}>{formatDay(date, locale)}</DayHeader>
      <TodoList ids={ids} showSource />
    </section>
  ));
}
