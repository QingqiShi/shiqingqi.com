import { describe, expect, it } from "vitest";
import { todoLimits } from "../report/todo-limits.ts";
import { sharedTodoText } from "./shared-todo-text.ts";

const none = { title: undefined, text: undefined, url: undefined };

describe("sharedTodoText", () => {
  it("joins the parts that differ, in one line", () => {
    expect(
      sharedTodoText({
        title: "A page",
        text: "Read\nthis",
        url: "https://a.example/b",
      }),
    ).toBe("A page Read this https://a.example/b");
  });

  it("says each part once, as apps often repeat one in another", () => {
    expect(
      sharedTodoText({
        title: "A page",
        text: "A page https://a.example/b",
        url: "https://a.example/b",
      }),
    ).toBe("A page https://a.example/b");
  });

  it("is empty when nothing was shared", () => {
    expect(sharedTodoText(none)).toBe("");
  });

  it("fits a title and keeps the link of a long text", () => {
    const url = "https://a.example/b";
    const shared = sharedTodoText({ ...none, text: "x".repeat(500), url });

    expect(shared).toHaveLength(todoLimits.titleChars);
    expect(shared.endsWith(` ${url}`)).toBe(true);
  });

  it("cuts a link that is longer than a title", () => {
    const url = `https://a.example/${"b".repeat(500)}`;

    expect(sharedTodoText({ ...none, title: "Read", url })).toHaveLength(
      todoLimits.titleChars,
    );
  });
});
