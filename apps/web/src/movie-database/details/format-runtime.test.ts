import { describe, it, expect } from "vitest";
import { formatRuntime } from "./format-runtime";

describe("formatRuntime", () => {
  it("formats hours and minutes in English", () => {
    expect(formatRuntime(148, "en")).toBe("2h 28m");
  });

  it("formats minutes only when less than an hour", () => {
    expect(formatRuntime(45, "en")).toBe("45m");
  });

  it("returns empty string for zero", () => {
    expect(formatRuntime(0, "en")).toBe("");
  });

  it("formats in Chinese locale", () => {
    expect(formatRuntime(148, "zh")).toBe("2小时28分钟");
  });
});
