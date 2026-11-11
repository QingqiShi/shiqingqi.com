"use client";

import { ReportCard } from "./report-card.tsx";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** A card of a report that is only to-dos. It goes when the owner deletes the last one. */
export function ReportTodoSection({
  title,
  headingLevel,
  ids,
}: {
  title: string;
  headingLevel: 2 | 3;
  ids: readonly string[];
}) {
  const { rows } = useTodoStore();
  const shown = ids.filter((id) => rows.some((row) => row.id === id));
  if (shown.length === 0) return null;
  return (
    <ReportCard title={title} headingLevel={headingLevel}>
      <TodoList ids={shown} form="plain" />
    </ReportCard>
  );
}
