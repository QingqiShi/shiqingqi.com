import { describe, it, expect } from "vitest";
import { isUnaryOperator } from "./is-unary-operator";

describe("isUnaryOperator", () => {
  it("returns true for valid unary operators", () => {
    expect(isUnaryOperator("±")).toBe(true);
    expect(isUnaryOperator("%")).toBe(true);
  });

  it("returns false for non-operator strings", () => {
    expect(isUnaryOperator("a")).toBe(false);
    expect(isUnaryOperator("1")).toBe(false);
    expect(isUnaryOperator("")).toBe(false);
  });

  it("returns false for binary operators", () => {
    expect(isUnaryOperator("+")).toBe(false);
    expect(isUnaryOperator("−")).toBe(false);
    expect(isUnaryOperator("×")).toBe(false);
    expect(isUnaryOperator("÷")).toBe(false);
  });
});
