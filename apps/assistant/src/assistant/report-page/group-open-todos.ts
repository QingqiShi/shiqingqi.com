export type TodoBoardView = "today" | "upcoming";

export type TodoGroupKey = "overdue" | "today" | "upcoming" | "no-date";

const VIEW_GROUPS: Record<TodoBoardView, readonly TodoGroupKey[]> = {
  today: ["overdue", "today"],
  upcoming: ["upcoming", "no-date"],
};

const AFTER_EVERY_DATE = "9999-12-31";

interface TodoDates {
  dueDate: string | null;
  startDate: string | null;
}

function groupOf({ dueDate, startDate }: TodoDates, today: string) {
  if (dueDate !== null && dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (startDate !== null && startDate <= today) return "today";
  return dueDate === null && startDate === null ? "no-date" : "upcoming";
}

/** The view that shows an open to-do. */
export function viewOfTodo(todo: TodoDates, today: string): TodoBoardView {
  return VIEW_GROUPS.today.includes(groupOf(todo, today))
    ? "today"
    : "upcoming";
}

/** The day that orders a to-do in its group: the next day it asks for attention. */
function orderDate(todo: TodoDates, group: TodoGroupKey) {
  const day = group === "upcoming" ? todo.startDate : null;
  return day ?? todo.dueDate ?? AFTER_EVERY_DATE;
}

/**
 * The open to-dos of each view by group, with no empty group. Today holds what
 * is overdue, due today or started by today; Upcoming holds everything else. In
 * a group, the soonest date comes first, and to-dos of one date keep their
 * order.
 */
export function groupOpenTodos<T extends TodoDates>(
  todos: readonly T[],
  today: string,
) {
  const groupsOf = (view: TodoBoardView) =>
    VIEW_GROUPS[view]
      .map((key) => ({
        key,
        todos: todos
          .filter((todo) => groupOf(todo, today) === key)
          .toSorted((a, b) =>
            orderDate(a, key).localeCompare(orderDate(b, key)),
          ),
      }))
      .filter((group) => group.todos.length > 0);
  return { today: groupsOf("today"), upcoming: groupsOf("upcoming") };
}
