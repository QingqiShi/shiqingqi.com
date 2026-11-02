import { localClock } from "../report/due-report-date.ts";

export interface DoneDay {
  /** The owner's local date, `YYYY-MM-DD`. */
  date: string;
  ids: readonly string[];
}

/** The done to-dos by the day they were done in `timeZone`, newest first. */
export function groupDoneTodos(
  todos: readonly { id: string; doneAt: string }[],
  timeZone: string,
): DoneDay[] {
  const days = new Map<string, string[]>();
  for (const { id, doneAt } of todos.toSorted((a, b) =>
    b.doneAt.localeCompare(a.doneAt),
  )) {
    const { date } = localClock(new Date(doneAt), timeZone);
    days.set(date, [...(days.get(date) ?? []), id]);
  }
  return Array.from(days, ([date, ids]) => ({ date, ids }));
}
