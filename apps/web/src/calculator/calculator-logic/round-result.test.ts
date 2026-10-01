import { describe, it, expect } from "vitest";
import { roundResult } from "./round-result";

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
