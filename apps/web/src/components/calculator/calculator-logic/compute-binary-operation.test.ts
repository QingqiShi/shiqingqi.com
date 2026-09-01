import { describe, it, expect } from "vitest";
import { computeBinaryOperation } from "./compute-binary-operation";

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
