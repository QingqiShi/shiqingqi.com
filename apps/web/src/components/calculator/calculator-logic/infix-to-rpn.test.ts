import { describe, it, expect } from "vitest";
import type { Token } from "../types";
import { infixToRPN } from "./infix-to-rpn";

describe("infixToRPN", () => {
  it("converts a simple addition", () => {
    const tokens: Token[] = [
      { type: "number", value: 2, raw: "2" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 3, raw: "3" },
    ];
    const rpn = infixToRPN(tokens);
    expect(rpn.map((t) => t.value)).toEqual([2, 3, "+"]);
  });

  it("handles multiplication precedence over addition", () => {
    // 2 + 3 × 4 → 2 3 4 × +
    const tokens: Token[] = [
      { type: "number", value: 2, raw: "2" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "×" },
      { type: "number", value: 4, raw: "4" },
    ];
    const rpn = infixToRPN(tokens);
    expect(rpn.map((t) => t.value)).toEqual([2, 3, 4, "×", "+"]);
  });

  it("handles left-to-right for equal precedence", () => {
    // 5 − 3 + 1 → 5 3 − 1 +
    const tokens: Token[] = [
      { type: "number", value: 5, raw: "5" },
      { type: "binaryOperator", value: "−" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 1, raw: "1" },
    ];
    const rpn = infixToRPN(tokens);
    expect(rpn.map((t) => t.value)).toEqual([5, 3, "−", 1, "+"]);
  });

  it("returns a single number unchanged", () => {
    const tokens: Token[] = [{ type: "number", value: 7, raw: "7" }];
    const rpn = infixToRPN(tokens);
    expect(rpn.map((t) => t.value)).toEqual([7]);
  });

  it("returns empty array for empty input", () => {
    expect(infixToRPN([])).toEqual([]);
  });

  it("handles complex mixed precedence", () => {
    // 1 + 2 × 3 − 4 ÷ 2 → 1 2 3 × + 4 2 ÷ −
    const tokens: Token[] = [
      { type: "number", value: 1, raw: "1" },
      { type: "binaryOperator", value: "+" },
      { type: "number", value: 2, raw: "2" },
      { type: "binaryOperator", value: "×" },
      { type: "number", value: 3, raw: "3" },
      { type: "binaryOperator", value: "−" },
      { type: "number", value: 4, raw: "4" },
      { type: "binaryOperator", value: "÷" },
      { type: "number", value: 2, raw: "2" },
    ];
    const rpn = infixToRPN(tokens);
    expect(rpn.map((t) => t.value)).toEqual([
      1,
      2,
      3,
      "×",
      "+",
      4,
      2,
      "÷",
      "−",
    ]);
  });
});
