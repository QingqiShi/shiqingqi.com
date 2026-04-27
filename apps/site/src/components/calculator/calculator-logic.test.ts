import { describe, it, expect } from "vitest";
import {
  isBinaryOperator,
  isUnaryOperator,
  roundResult,
  computeBinaryOperation,
  infixToRPN,
  evaluateRPN,
  evaluateExpression,
} from "./calculator-logic";
import type { Token } from "./types";

describe("roundResult", () => {
  it("eliminates floating-point precision artifacts for 0.1 + 0.2", () => {
    // Raw JavaScript: 0.1 + 0.2 = 0.30000000000000004
    const rawResult = 0.1 + 0.2;
    expect(rawResult).not.toBe(0.3); // Confirms the bug exists in raw JS

    expect(roundResult(rawResult)).toBe(0.3);
  });

  it("eliminates floating-point precision artifacts for 0.1 + 0.7", () => {
    // Raw JavaScript: 0.1 + 0.7 = 0.7999999999999999
    const rawResult = 0.1 + 0.7;
    expect(rawResult).not.toBe(0.8); // Confirms the bug exists in raw JS

    expect(roundResult(rawResult)).toBe(0.8);
  });

  it("eliminates floating-point precision artifacts for 0.3 - 0.1", () => {
    // Raw JavaScript: 0.3 - 0.1 = 0.19999999999999998
    const rawResult = 0.3 - 0.1;
    expect(rawResult).not.toBe(0.2); // Confirms the bug exists in raw JS

    expect(roundResult(rawResult)).toBe(0.2);
  });

  it("preserves integers", () => {
    expect(roundResult(42)).toBe(42);
    expect(roundResult(0)).toBe(0);
    expect(roundResult(-100)).toBe(-100);
  });

  it("preserves clean decimal numbers", () => {
    expect(roundResult(3.14)).toBe(3.14);
    expect(roundResult(0.5)).toBe(0.5);
    expect(roundResult(-2.5)).toBe(-2.5);
  });

  it("handles special values", () => {
    expect(roundResult(Infinity)).toBe(Infinity);
    expect(roundResult(-Infinity)).toBe(-Infinity);
    expect(roundResult(NaN)).toBeNaN();
  });

  it("preserves precision for numbers within 12 significant digits", () => {
    expect(roundResult(123456789012)).toBe(123456789012);
    expect(roundResult(0.123456789012)).toBe(0.123456789012);
  });
});

describe("computeBinaryOperation", () => {
  describe("addition", () => {
    it("adds two numbers correctly", () => {
      expect(computeBinaryOperation(2, 3, "+")).toBe(5);
    });

    it("handles floating-point precision for 0.1 + 0.2", () => {
      expect(computeBinaryOperation(0.1, 0.2, "+")).toBe(0.3);
    });

    it("handles floating-point precision for 0.1 + 0.7", () => {
      expect(computeBinaryOperation(0.1, 0.7, "+")).toBe(0.8);
    });
  });

  describe("subtraction", () => {
    it("subtracts two numbers correctly", () => {
      expect(computeBinaryOperation(5, 3, "−")).toBe(2);
    });

    it("handles floating-point precision for 0.3 - 0.1", () => {
      expect(computeBinaryOperation(0.3, 0.1, "−")).toBe(0.2);
    });
  });

  describe("multiplication", () => {
    it("multiplies two numbers correctly", () => {
      expect(computeBinaryOperation(4, 3, "×")).toBe(12);
    });

    it("handles floating-point precision for 0.1 × 0.2", () => {
      expect(computeBinaryOperation(0.1, 0.2, "×")).toBe(0.02);
    });
  });

  describe("division", () => {
    it("divides two numbers correctly", () => {
      expect(computeBinaryOperation(12, 4, "÷")).toBe(3);
    });

    it("returns NaN for division by zero", () => {
      expect(computeBinaryOperation(5, 0, "÷")).toBeNaN();
    });

    it("handles floating-point precision", () => {
      expect(computeBinaryOperation(0.3, 0.1, "÷")).toBe(3);
    });
  });
});

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
