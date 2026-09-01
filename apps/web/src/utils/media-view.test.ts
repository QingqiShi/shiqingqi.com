import { describe, expect, it } from "vitest";
import { isMediaView } from "./media-view";

describe("isMediaView", () => {
  it('returns true for "grid"', () => {
    expect(isMediaView("grid")).toBe(true);
  });

  it('returns true for "table"', () => {
    expect(isMediaView("table")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isMediaView("list")).toBe(false);
    expect(isMediaView("Grid")).toBe(false);
    expect(isMediaView("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isMediaView(null)).toBe(false);
    expect(isMediaView(undefined)).toBe(false);
    expect(isMediaView(0)).toBe(false);
  });
});
