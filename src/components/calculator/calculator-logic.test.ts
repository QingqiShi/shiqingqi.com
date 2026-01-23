import { describe, it, expect } from "vitest";
import {
  roundResult,
  computeBinaryOperation,
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
});
