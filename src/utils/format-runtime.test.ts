import { describe, it, expect } from "vitest";
import { formatRuntime } from "./format-runtime";

describe("formatRuntime", () => {
  it("formats hours and minutes", () => {
    expect(formatRuntime(148, "h", "m")).toBe("2h 28m");
  });

  it("formats minutes only when less than an hour", () => {
    expect(formatRuntime(45, "h", "m")).toBe("45m");
  });

  it("formats exactly one hour", () => {
    expect(formatRuntime(60, "h", "m")).toBe("1h 0m");
  });

  it("returns empty string for zero", () => {
    expect(formatRuntime(0, "h", "m")).toBe("");
  });

  it("returns empty string for NaN", () => {
    expect(formatRuntime(NaN, "h", "m")).toBe("");
  });

  it("formats large values", () => {
    expect(formatRuntime(240, "h", "m")).toBe("4h 0m");
  });

  it("formats single-digit minutes", () => {
    expect(formatRuntime(65, "h", "m")).toBe("1h 5m");
  });

  it("uses the provided locale labels", () => {
    expect(formatRuntime(148, " 小时", " 分钟")).toBe("2 小时 28 分钟");
  });
});
