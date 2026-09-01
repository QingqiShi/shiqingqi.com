import type { BinaryOperator } from "../types";
import { roundResult } from "./round-result";

export function computeBinaryOperation(
  lhs: number,
  rhs: number,
  operator: BinaryOperator,
): number {
  let result: number;
  switch (operator) {
    case "+":
      result = lhs + rhs;
      break;
    case "−":
      result = lhs - rhs;
      break;
    case "×":
      result = lhs * rhs;
      break;
    case "÷":
      if (rhs === 0) {
        return NaN; // Division by zero produces NaN for "Error" display
      }
      result = lhs / rhs;
      break;
  }
  return roundResult(result);
}
