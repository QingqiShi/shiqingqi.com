import { describe, expect, it } from "vitest";
import { isModifiedClick } from "./is-modified-click";

const plainClick = {
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  button: 0,
};

describe("isModifiedClick", () => {
  it("returns false for a plain primary-button click", () => {
    expect(isModifiedClick(plainClick)).toBe(false);
  });

  it("returns true when the Meta key is held", () => {
    expect(isModifiedClick({ ...plainClick, metaKey: true })).toBe(true);
  });

  it("returns true when the Ctrl key is held", () => {
    expect(isModifiedClick({ ...plainClick, ctrlKey: true })).toBe(true);
  });

  it("returns true when the Shift key is held", () => {
    expect(isModifiedClick({ ...plainClick, shiftKey: true })).toBe(true);
  });

  it("returns true when the Alt key is held", () => {
    expect(isModifiedClick({ ...plainClick, altKey: true })).toBe(true);
  });

  it("returns true for a non-primary button (e.g. middle-click)", () => {
    expect(isModifiedClick({ ...plainClick, button: 1 })).toBe(true);
  });
});
