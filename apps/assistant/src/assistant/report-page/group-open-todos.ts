export type TodoGroupKey = "overdue" | "today" | "upcoming" | "no-date";

const GROUP_ORDER: readonly TodoGroupKey[] = [
  "overdue",
  "today",
  "upcoming",
  "no-date",
];

function groupOf(dueDate: string | null, today: string): TodoGroupKey {
  if (dueDate === null) return "no-date";
  if (dueDate < today) return "overdue";
  return dueDate === today ? "today" : "upcoming";
}

/**
 * The open to-dos by when they are due, in the order of `GROUP_ORDER`, with
 * no empty group. In a group, the soonest due date comes first, and to-dos of
 * one date keep their order.
 */
export function groupOpenTodos<T extends { dueDate: string | null }>(
  todos: readonly T[],
  today: string,
) {
  const sorted = todos.toSorted((a, b) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
  );
  return GROUP_ORDER.map((key) => ({
    key,
    todos: sorted.filter((todo) => groupOf(todo.dueDate, today) === key),
  })).filter((group) => group.todos.length > 0);
}
