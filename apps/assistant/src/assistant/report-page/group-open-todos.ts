import { waitsAfter } from "../report/dates-in-order.ts";

export type TodoBoardView = "today" | "upcoming";

export type TodoGroupKey =
  "overdue" | "today" | "upcoming" | "waiting" | "no-date";

const VIEW_GROUPS: Record<TodoBoardView, readonly TodoGroupKey[]> = {
  today: ["overdue", "today"],
  upcoming: ["upcoming", "waiting", "no-date"],
};

interface TodoDates {
  dueDate: string | null;
  startDate: string | null;
  waitingOn?: string | null;
  followUpDate?: string | null;
}

export function groupOf(todo: TodoDates, today: string): TodoGroupKey {
  const { dueDate, startDate, waitingOn } = todo;
  if (waitsAfter(todo, today)) return "waiting";
  if (dueDate !== null && dueDate < today) return "overdue";
  if (dueDate === today || waitingOn) return "today";
  if (startDate !== null && startDate <= today) return "today";
  return dueDate === null && startDate === null ? "no-date" : "upcoming";
}

/** The view that shows an open to-do. */
export function viewOfTodo(todo: TodoDates, today: string): TodoBoardView {
  return VIEW_GROUPS.today.includes(groupOf(todo, today))
    ? "today"
    : "upcoming";
}

/** The next day that a to-do of the `upcoming` group asks for attention. */
function nextDate(todo: TodoDates) {
  return todo.startDate ?? todo.dueDate ?? "";
}

/**
 * The open to-dos of each view by group, with no empty group, in the order they
 * come in. Today holds what is overdue, due today, started by today or at its
 * follow-up date; Upcoming holds everything else, and what waits has its own group
 * there, whatever its dates. Only the `upcoming` group sorts, by date, and to-dos of
 * one date keep their order.
 */
export function groupOpenTodos<T extends TodoDates>(
  todos: readonly T[],
  today: string,
) {
  const groupsOf = (view: TodoBoardView) =>
    VIEW_GROUPS[view]
      .map((key) => {
        const inGroup = todos.filter((todo) => groupOf(todo, today) === key);
        return {
          key,
          todos:
            key === "upcoming"
              ? inGroup.toSorted((a, b) =>
                  nextDate(a).localeCompare(nextDate(b)),
                )
              : inGroup,
        };
      })
      .filter((group) => group.todos.length > 0);
  return { today: groupsOf("today"), upcoming: groupsOf("upcoming") };
}

/**
 * The parts of a group in which the owner can order to-dos by hand. The
 * `upcoming` group has one part per date, and every other group is one part.
 */
export function orderRuns<T extends TodoDates>(group: {
  key: TodoGroupKey;
  todos: readonly T[];
}): { key: string; todos: readonly T[] }[] {
  if (group.key !== "upcoming") return [group];
  return [...Map.groupBy(group.todos, nextDate)].map(([key, todos]) => ({
    key,
    todos,
  }));
}
