"use client";

import { ReportSection } from "./report-section.tsx";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** A section of a report that is only to-dos. It goes when the owner deletes the last one. */
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
    <ReportSection title={title} headingLevel={headingLevel}>
      <TodoList ids={shown} />
    </ReportSection>
  );
}
