import { describe, expect, it } from "vitest";
import { groupOpenTodos } from "./group-open-todos.ts";

const TODAY = "2026-11-02";

describe("groupOpenTodos", () => {
  it("puts each to-do in the group of its due date, in order, with no empty group", () => {
    const groups = groupOpenTodos(
      [
        { dueDate: null },
        { dueDate: "2026-11-05" },
        { dueDate: TODAY },
        { dueDate: "2026-11-01" },
      ],
      TODAY,
    );

    expect(groups.map((group) => [group.key, group.todos[0]?.dueDate])).toEqual(
      [
        ["overdue", "2026-11-01"],
        ["today", TODAY],
        ["upcoming", "2026-11-05"],
        ["no-date", null],
      ],
    );
    expect(groupOpenTodos([{ dueDate: null }], TODAY)).toHaveLength(1);
  });

  it("lists the soonest due date first in a group", () => {
    const [upcoming] = groupOpenTodos(
      [{ dueDate: "2026-11-20" }, { dueDate: "2026-11-03" }],
      TODAY,
    );

    expect(upcoming.todos.map((todo) => todo.dueDate)).toEqual([
      "2026-11-03",
      "2026-11-20",
    ]);
  });
});
