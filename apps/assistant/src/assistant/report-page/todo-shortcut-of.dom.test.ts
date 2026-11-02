import { afterEach, describe, expect, it } from "vitest";
import { idsBetween, todoShortcutOf } from "./todo-shortcut-of.ts";

afterEach(() => {
  document.body.replaceChildren();
});

function pressIn(html: string, init: KeyboardEventInit) {
  document.body.innerHTML = html;
  const target = document.querySelector("[data-target]");
  if (!target) throw new Error("no target");
  let shortcut: ReturnType<typeof todoShortcutOf> = null;
  target.addEventListener("keydown", (event) => {
    if (event instanceof KeyboardEvent) shortcut = todoShortcutOf(event);
  });
  target.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, ...init }),
  );
  return shortcut;
}

describe("todoShortcutOf", () => {
  it("reads a key that a row or the page has focus for", () => {
    expect(pressIn("<li data-target></li>", { key: "x" })).toBe("done");
    expect(pressIn('<input data-target type="checkbox" />', { key: "j" })).toBe(
      "next",
    );
  });

  it("leaves a key to a text field, a popover and an open editor", () => {
    expect(pressIn("<input data-target />", { key: "x" })).toBeNull();
    expect(
      pressIn("<textarea data-target></textarea>", { key: "n" }),
    ).toBeNull();
    expect(
      pressIn('<div role="dialog"><button data-target></button></div>', {
        key: "j",
      }),
    ).toBeNull();
    expect(
      pressIn("<li data-todo-editor><button data-target></button></li>", {
        key: "e",
      }),
    ).toBeNull();
  });

  it("ignores a key that an IME takes", () => {
    expect(
      pressIn("<li data-target></li>", { key: "x", isComposing: true }),
    ).toBeNull();
  });

  it("leaves a key with a modifier to the browser", () => {
    expect(
      pressIn("<li data-target></li>", { key: "n", metaKey: true }),
    ).toBeNull();
  });

  it("closes one to-do for one press, when the key stays down", () => {
    expect(
      pressIn("<li data-target></li>", { key: "x", repeat: true }),
    ).toBeNull();
    expect(pressIn("<li data-target></li>", { key: "j", repeat: true })).toBe(
      "next",
    );
  });
});

describe("idsBetween", () => {
  const ids = ["a", "b", "c", "d"];

  it("takes both ends, in either direction", () => {
    expect(idsBetween(ids, "b", "d")).toEqual(["b", "c", "d"]);
    expect(idsBetween(ids, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("takes only the target when the start has left the list", () => {
    expect(idsBetween(ids, "gone", "c")).toEqual(["c"]);
  });
});
