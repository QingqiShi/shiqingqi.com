import { describe, it, expect } from "vitest";
import type { Token } from "../types";
import { evaluateRPN } from "./evaluate-rpn";

describe("evaluateRPN", () => {
  it("evaluates a simple addition in RPN", () => {
    const tokens: Token[] = [
      { type: "number", value: 2, raw: "2" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "+" },
    ];
    expect(evaluateRPN(tokens)).toBe(5);
  });

  it("evaluates a single number", () => {
    const tokens: Token[] = [{ type: "number", value: 42, raw: "42" }];
    expect(evaluateRPN(tokens)).toBe(42);
  });

  it("returns NaN for empty token array", () => {
    expect(evaluateRPN([])).toBeNaN();
  });

  it("returns NaN for invalid RPN (operator without enough operands)", () => {
    const tokens: Token[] = [
      { type: "number", value: 5, raw: "5" },
      { type: "binaryOperator", value: "+" },
      { type: "binaryOperator", value: "×" },
    ];
    expect(evaluateRPN(tokens)).toBeNaN();
  });

  it("evaluates chained operations in RPN", () => {
    // 2 3 + 4 × = (2 + 3) × 4 = 20
    const tokens: Token[] = [
      { type: "number", value: 2, raw: "2" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 4, raw: "4" },
      { type: "binaryOperator", value: "×" },
    ];
    expect(evaluateRPN(tokens)).toBe(20);
  });
});
