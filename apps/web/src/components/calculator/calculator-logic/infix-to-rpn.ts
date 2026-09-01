import { operatorPrecedence } from "../constants";
import type { BinaryOperator, Token } from "../types";

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
    } else {
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
