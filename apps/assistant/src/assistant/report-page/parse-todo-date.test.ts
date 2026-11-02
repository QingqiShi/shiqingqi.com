import { describe, expect, it } from "vitest";
import { parseTodoDate } from "./parse-todo-date.ts";

// A Monday.
const MONDAY = "2026-11-02";

function due(text: string, today = MONDAY) {
  return parseTodoDate(text, today).dueDate;
}

describe("parseTodoDate", () => {
  it("takes the date words out of the title", () => {
    expect(parseTodoDate("周五前交报销", MONDAY)).toEqual({
      title: "交报销",
      dueDate: "2026-11-06",
      matched: "周五前",
    });
    expect(parseTodoDate("Pay rent by next monday, please", MONDAY)).toEqual({
      title: "Pay rent, please",
      dueDate: "2026-11-09",
      matched: "by next monday",
    });
    expect(parseTodoDate("明天的会", MONDAY).title).toBe("会");
  });

  it("never leaves an empty title", () => {
    expect(parseTodoDate("明天", MONDAY)).toMatchObject({
      title: "明天",
      dueDate: "2026-11-03",
    });
    expect(parseTodoDate("by tomorrow", MONDAY).title).toBe("by tomorrow");
  });

  it("reads days from today", () => {
    expect(due("今天交")).toBe("2026-11-02");
    expect(due("大后天交")).toBe("2026-11-05");
    expect(due("call today")).toBe("2026-11-02");
    expect(due("call before tomorrow")).toBe("2026-11-03");
  });

  it("takes a bare weekday as the next one, today included", () => {
    expect(due("周一开会")).toBe(MONDAY);
    expect(due("礼拜天开会")).toBe("2026-11-08");
    expect(due("call on friday")).toBe("2026-11-06");
  });

  it("takes next X as that weekday of next week, which starts on Monday", () => {
    expect(due("下周一开会")).toBe("2026-11-09");
    expect(due("下星期日开会")).toBe("2026-11-15");
    expect(due("下周一开会", "2026-11-08")).toBe("2026-11-09");
    expect(due("next sunday", "2026-11-08")).toBe("2026-11-15");
  });

  it("moves a passed day of the month to next month", () => {
    expect(due("5号交房租")).toBe("2026-11-05");
    expect(due("1号交房租")).toBe("2026-12-01");
    expect(due("31号交房租", "2026-11-02")).toBe("2026-12-31");
    expect(due("30号交房租", "2027-02-10")).toBe("2027-03-30");
  });

  it("moves a passed month and day to next year", () => {
    expect(due("3月5日前交")).toBe("2027-03-05");
    expect(due("12月5号交")).toBe("2026-12-05");
    expect(due("mar 5 report")).toBe("2027-03-05");
    expect(due("due march 5th")).toBe("2027-03-05");
    expect(due("5 december party")).toBe("2026-12-05");
  });

  it("does not take an impossible date", () => {
    expect(parseTodoDate("2月30日交", MONDAY)).toEqual({
      title: "2月30日交",
      dueDate: null,
      matched: null,
    });
    expect(due("feb 30 report")).toBeNull();
  });

  it("does not take words that only look like dates", () => {
    for (const text of [
      "sat on the sofa",
      "sun cream",
      "mon ami",
      "marching band",
      "may be later",
      "today's report",
      "买5号电池",
      "一周五次",
      "上周五的账单",
    ]) {
      expect(due(text), text).toBeNull();
    }
    expect(parseTodoDate("明天前往机场", MONDAY)).toMatchObject({
      title: "前往机场",
      dueDate: "2026-11-03",
    });
  });

  it("takes the first date when the text names two", () => {
    expect(parseTodoDate("明天交周五的报告", MONDAY)).toMatchObject({
      dueDate: "2026-11-03",
      title: "交周五的报告",
    });
  });
});
