import { describe, expect, it } from "vitest";
import { isRecord } from "./type-guards";

describe("isRecord", () => {
  it("returns true for a plain object", () => {
    expect(isRecord({ a: 1, b: "two" })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(isRecord({})).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isRecord([1, 2, 3])).toBe(false);
    expect(isRecord([])).toBe(false);
  });

  it("returns false for primitive types", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(Symbol("sym"))).toBe(false);
  });

  it("returns true for objects created via Object.create(null)", () => {
    expect(isRecord(Object.create(null))).toBe(true);
  });

  it("narrows the type correctly", () => {
    const value: unknown = { key: "val" };
    if (isRecord(value)) {
      // TypeScript should allow property access after narrowing
      expect(value.key).toBe("val");
    }
  });
});
