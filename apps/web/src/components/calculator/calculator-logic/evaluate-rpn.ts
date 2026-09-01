import type { Token } from "../types";
import { computeBinaryOperation } from "./compute-binary-operation";

/**
 * Evaluate an expression in Reverse Polish Notation.
 */
export function evaluateRPN(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      stack.push(token.value);
    } else {
      const rhs = stack.pop();
      const lhs = stack.pop();
      if (rhs === undefined || lhs === undefined) {
        return NaN; // Invalid expression
      }
      const result = computeBinaryOperation(lhs, rhs, token.value);
      stack.push(result);
    }
  }

  return stack[0] ?? NaN;
}
