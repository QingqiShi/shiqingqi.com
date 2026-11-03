import { describe, expect, it } from "vitest";
import { groupOpenTodos, viewOfTodo } from "./group-open-todos.ts";

const TODAY = "2026-11-02";

const dated = (dueDate: string | null, startDate: string | null = null) => ({
  dueDate,
  startDate,
});

describe("groupOpenTodos", () => {
  it("puts what is overdue, due today or started by today in Today, and the rest in Upcoming", () => {
    const overdue = dated("2026-11-01");
    const dueToday = dated(TODAY);
    const started = dated("2026-11-10", TODAY);
    const startedWithoutDue = dated(null, "2026-10-30");
    const notStarted = dated("2026-11-10", "2026-11-08");
    const onlyDue = dated("2026-11-05");
    const noDate = dated(null);

    const { today, upcoming } = groupOpenTodos(
      [
        noDate,
        onlyDue,
        notStarted,
        startedWithoutDue,
        started,
        dueToday,
        overdue,
      ],
      TODAY,
    );

    expect(today).toEqual([
      { key: "overdue", todos: [overdue] },
      { key: "today", todos: [dueToday, started, startedWithoutDue] },
    ]);
    expect(upcoming).toEqual([
      { key: "upcoming", todos: [onlyDue, notStarted] },
      { key: "no-date", todos: [noDate] },
    ]);
  });

  it("orders Upcoming by the day each to-do starts, and else by its due date", () => {
    const { upcoming } = groupOpenTodos(
      [
        dated("2026-11-20", "2026-11-04"),
        dated("2026-11-05"),
        dated("2026-11-03"),
      ],
      TODAY,
    );

    expect(upcoming[0].todos.map((todo) => todo.dueDate)).toEqual([
      "2026-11-03",
      "2026-11-20",
      "2026-11-05",
    ]);
  });

  it("leaves out an empty group", () => {
    expect(groupOpenTodos([dated(null)], TODAY)).toEqual({
      today: [],
      upcoming: [{ key: "no-date", todos: [dated(null)] }],
    });
  });
});

describe("viewOfTodo", () => {
  it("sends a new to-do with no date to Upcoming", () => {
    expect(viewOfTodo(dated(null), TODAY)).toBe("upcoming");
    expect(viewOfTodo(dated(TODAY), TODAY)).toBe("today");
  });
});
