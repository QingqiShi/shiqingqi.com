import type { BinaryOperator, Token } from "./types.ts";
import {
  binaryOperatorsSet,
  operatorPrecedence,
  unaryOperatorsSet,
} from "./types.ts";

export function isBinaryOperator(value: string): value is BinaryOperator {
  return binaryOperatorsSet.has(value);
}

export function isUnaryOperator(value: string): value is "±" | "%" {
  return unaryOperatorsSet.has(value);
}

export function computeBinaryOperation(
  lhs: number,
  rhs: number,
  operator: BinaryOperator,
): number {
  switch (operator) {
    case "+":
      return lhs + rhs;
    case "−":
      return lhs - rhs;
    case "×":
      return lhs * rhs;
    case "÷":
      if (rhs === 0) {
        return NaN; // Division by zero produces NaN for "Error" display
      }
      return lhs / rhs;
  }
}

/**
 * Convert infix notation to Reverse Polish Notation using the shunting-yard algorithm.
 * This handles operator precedence correctly.
 */
export function infixToRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operatorStack: BinaryOperator[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
    } else if (token.type === "binaryOperator") {
      while (operatorStack.length > 0) {
        const topOperator = operatorStack[operatorStack.length - 1];
        if (
          operatorPrecedence[topOperator] >= operatorPrecedence[token.value]
        ) {
          operatorStack.pop();
          output.push({ type: "binaryOperator", value: topOperator });
        } else {
          break;
        }
      }
      operatorStack.push(token.value);
    }
  }

  while (operatorStack.length > 0) {
    const operator = operatorStack.pop();
    if (operator !== undefined) {
      output.push({ type: "binaryOperator", value: operator });
    }
  }

  return output;
}

/**
 * Evaluate an expression in Reverse Polish Notation.
 */
export function evaluateRPN(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      stack.push(token.value);
    } else if (token.type === "binaryOperator") {
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

/**
 * Evaluate a full expression from tokens.
 */
export function evaluateExpression(tokens: Token[]): number {
  return evaluateRPN(infixToRPN(tokens));
}
