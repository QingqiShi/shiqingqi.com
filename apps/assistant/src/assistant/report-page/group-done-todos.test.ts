import { describe, expect, it } from "vitest";
import { groupDoneTodos } from "./group-done-todos.ts";

describe("groupDoneTodos", () => {
  it("puts a to-do on the day it was done in the owner's zone, newest day first", () => {
    const todos = [
      { id: "tokyo-morning", doneAt: "2026-11-01T23:30:00.000Z" },
      { id: "tokyo-evening", doneAt: "2026-11-01T14:00:00.000Z" },
      { id: "day-before", doneAt: "2026-10-31T14:00:00.000Z" },
    ];

    expect(groupDoneTodos(todos, "Asia/Tokyo")).toEqual([
      { date: "2026-11-02", ids: ["tokyo-morning"] },
      { date: "2026-11-01", ids: ["tokyo-evening"] },
      { date: "2026-10-31", ids: ["day-before"] },
    ]);
    expect(groupDoneTodos(todos, "UTC")).toEqual([
      { date: "2026-11-01", ids: ["tokyo-morning", "tokyo-evening"] },
      { date: "2026-10-31", ids: ["day-before"] },
    ]);
  });
});
