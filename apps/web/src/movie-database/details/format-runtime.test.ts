import { describe, it, expect } from "vitest";
import { formatRuntime } from "./format-runtime";

describe("formatRuntime", () => {
  it("formats hours and minutes in English", () => {
    expect(formatRuntime(148, "en")).toBe("2h 28m");
  });

  it("formats minutes only when less than an hour", () => {
    expect(formatRuntime(45, "en")).toBe("45m");
  });

  it("formats exactly one hour without trailing minutes", () => {
    expect(formatRuntime(60, "en")).toBe("1h");
  });

  it("returns empty string for zero", () => {
    expect(formatRuntime(0, "en")).toBe("");
  });

  it("returns empty string for NaN", () => {
    expect(formatRuntime(NaN, "en")).toBe("");
  });

  it("formats exact multiples of an hour without trailing minutes", () => {
    expect(formatRuntime(240, "en")).toBe("4h");
  });

  it("formats single-digit minutes", () => {
    expect(formatRuntime(65, "en")).toBe("1h 5m");
  });

  it("formats in Chinese locale", () => {
    expect(formatRuntime(148, "zh")).toBe("2小时28分钟");
  });

  it("formats Chinese locale with hours only", () => {
    expect(formatRuntime(60, "zh")).toBe("1小时");
  });

  it("formats Chinese locale with minutes only", () => {
    expect(formatRuntime(45, "zh")).toBe("45分钟");
  });
});
