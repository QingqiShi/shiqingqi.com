import type { Token } from "#src/calculator/types.ts";
import { evaluateRPN } from "./evaluate-rpn";
import { infixToRPN } from "./infix-to-rpn";

/**
 * Evaluate a full expression from tokens.
 */
export function evaluateExpression(tokens: Token[]): number {
  return evaluateRPN(infixToRPN(tokens));
}
