import { describe, expect, it } from "vitest";
import { isEditableTarget } from "./is-editable-target";

describe("isEditableTarget", () => {
  it("returns true for text, number, range, and color inputs", () => {
    for (const type of ["text", "number", "range", "color", "search"]) {
      const input = document.createElement("input");
      input.type = type;
      expect(isEditableTarget(input)).toBe(true);
    }
  });

  it("returns true for textarea and select", () => {
    expect(isEditableTarget(document.createElement("textarea"))).toBe(true);
    expect(isEditableTarget(document.createElement("select"))).toBe(true);
  });

  it("returns true for contenteditable elements and their children", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const child = document.createElement("span");
    div.appendChild(child);
    document.body.appendChild(div);
    try {
      expect(isEditableTarget(div)).toBe(true);
      expect(isEditableTarget(child)).toBe(true);
    } finally {
      div.remove();
    }
  });

  it("returns false for non-editable elements", () => {
    expect(isEditableTarget(document.createElement("button"))).toBe(false);
    expect(isEditableTarget(document.createElement("canvas"))).toBe(false);
    expect(isEditableTarget(document.createElement("div"))).toBe(false);
    expect(isEditableTarget(document.body)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});
