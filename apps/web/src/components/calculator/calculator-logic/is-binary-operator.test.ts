import { describe, it, expect } from "vitest";
import { isBinaryOperator } from "./is-binary-operator";

describe("isBinaryOperator", () => {
  it("returns true for valid binary operators", () => {
    expect(isBinaryOperator("+")).toBe(true);
    expect(isBinaryOperator("−")).toBe(true);
    expect(isBinaryOperator("×")).toBe(true);
    expect(isBinaryOperator("÷")).toBe(true);
  });

  it("returns false for non-operator strings", () => {
    expect(isBinaryOperator("a")).toBe(false);
    expect(isBinaryOperator("1")).toBe(false);
    expect(isBinaryOperator("")).toBe(false);
    expect(isBinaryOperator("=")).toBe(false);
  });

  it("returns false for unary operators", () => {
    expect(isBinaryOperator("±")).toBe(false);
    expect(isBinaryOperator("%")).toBe(false);
  });
});
