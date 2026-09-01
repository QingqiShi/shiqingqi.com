import { describe, it, expect } from "vitest";
import type { Token } from "../types";
import { evaluateExpression } from "./evaluate-expression";

describe("evaluateExpression", () => {
  it("evaluates 0.1 + 0.2 correctly", () => {
    const tokens: Token[] = [
      { type: "number", value: 0.1, raw: "0.1" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 0.2, raw: "0.2" },
    ];
    expect(evaluateExpression(tokens)).toBe(0.3);
  });

  it("evaluates chained operations with correct precision", () => {
    // 0.1 + 0.2 + 0.3 should equal 0.6
    const tokens: Token[] = [
      { type: "number", value: 0.1, raw: "0.1" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 0.2, raw: "0.2" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 0.3, raw: "0.3" },
    ];
    expect(evaluateExpression(tokens)).toBe(0.6);
  });

  it("respects multiplication precedence over addition", () => {
    // 2 + 3 × 4 = 14 (not 20)
    const tokens: Token[] = [
      { type: "number", value: 2, raw: "2" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "×" },
      { type: "number", value: 4, raw: "4" },
    ];
    expect(evaluateExpression(tokens)).toBe(14);
  });

  it("respects division precedence over subtraction", () => {
    // 10 − 6 ÷ 2 = 7 (not 2)
    const tokens: Token[] = [
      { type: "number", value: 10, raw: "10" },
      { type: "binaryOperator", value: "−" },
      { type: "number", value: 6, raw: "6" },
      { type: "binaryOperator", value: "÷" },
      { type: "number", value: 2, raw: "2" },
    ];
    expect(evaluateExpression(tokens)).toBe(7);
  });

  it("handles mixed precedence: 1 + 2 × 3 + 4", () => {
    // 1 + 2 × 3 + 4 = 1 + 6 + 4 = 11
    const tokens: Token[] = [
      { type: "number", value: 1, raw: "1" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 2, raw: "2" },
      { type: "binaryOperator", value: "×" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 4, raw: "4" },
    ];
    expect(evaluateExpression(tokens)).toBe(11);
  });

  it("evaluates a single number", () => {
    const tokens: Token[] = [{ type: "number", value: 42, raw: "42" }];
    expect(evaluateExpression(tokens)).toBe(42);
  });

  it("handles division by zero", () => {
    const tokens: Token[] = [
      { type: "number", value: 5, raw: "5" },
      { type: "binaryOperator", value: "÷" },
      { type: "number", value: 0, raw: "0" },
    ];
    expect(evaluateExpression(tokens)).toBeNaN();
  });

  it("handles same-precedence operators left to right", () => {
    // 10 − 3 + 2 = 9 (left-to-right: (10 − 3) + 2)
    const tokens: Token[] = [
      { type: "number", value: 10, raw: "10" },
      { type: "binaryOperator", value: "−" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 2, raw: "2" },
    ];
    expect(evaluateExpression(tokens)).toBe(9);
  });

  it("handles same-precedence multiplicative operators left to right", () => {
    // 12 ÷ 3 × 2 = 8 (left-to-right: (12 ÷ 3) × 2)
    const tokens: Token[] = [
      { type: "number", value: 12, raw: "12" },
      { type: "binaryOperator", value: "÷" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "×" },
      { type: "number", value: 2, raw: "2" },
    ];
    expect(evaluateExpression(tokens)).toBe(8);
  });
});
