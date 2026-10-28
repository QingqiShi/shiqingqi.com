import { describe, it, expect } from "vitest";
import type { Token } from "#src/calculator/types.ts";
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
});
