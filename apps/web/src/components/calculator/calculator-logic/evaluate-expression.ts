import type { Token } from "../types";
import { evaluateRPN } from "./evaluate-rpn";
import { infixToRPN } from "./infix-to-rpn";

/**
 * Evaluate a full expression from tokens.
 */
export function evaluateExpression(tokens: Token[]): number {
  return evaluateRPN(infixToRPN(tokens));
}
