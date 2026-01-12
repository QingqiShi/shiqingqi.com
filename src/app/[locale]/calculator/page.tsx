"use client";
import * as stylex from "@stylexjs/stylex";
import { Fragment, useState } from "react";
import { buttonTokens } from "#src/components/shared/button.stylex.ts";
import { Button } from "#src/components/shared/button.tsx";
import { border, color, ratio, shadow, space } from "#src/tokens.stylex.ts";

// Button label constants
const BUTTON_CLEAR = "ac";
const BUTTON_NEGATE = "±";
const BUTTON_PERCENT = "%";
const BUTTON_EQUALS = "=";
const BUTTON_DECIMAL = ".";
const BUTTON_ZERO = "0";

const buttons = [
  [BUTTON_CLEAR, BUTTON_NEGATE, BUTTON_PERCENT, "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  [BUTTON_ZERO, BUTTON_DECIMAL, BUTTON_EQUALS],
];

const numbersSet = new Set([
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
]);
const binaryOperators = ["+", "−", "×", "÷"] as const;
type BinaryOperator = (typeof binaryOperators)[number];
const unaryOperators = ["±", "%"] as const;
type UnaryOperator = (typeof unaryOperators)[number];
const binaryOperatorsSet = new Set<BinaryOperator>(binaryOperators);
const unaryOperatorsSet = new Set<UnaryOperator>(unaryOperators);

const operatorPrecedence: { [key in BinaryOperator]: number } = {
  "+": 1,
  "−": 1,
  "×": 2,
  "÷": 2,
};

type Token =
  | { type: "number"; value: number; raw: string }
  | { type: "binaryOperator"; value: BinaryOperator };

function isBinaryOperator(value: string): value is BinaryOperator {
  return binaryOperatorsSet.has(value as BinaryOperator);
}

function isUnaryOperator(value: string): value is UnaryOperator {
  return unaryOperatorsSet.has(value as UnaryOperator);
}

function computeBinaryOperation(
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

function infixToRPN(tokens: Token[]): Token[] {
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

function evaluateRPN(tokens: Token[]): number {
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

export default function Page() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentToken, setCurrentToken] = useState<Token>({
    type: "number",
    value: 0,
    raw: "0",
  });

  const handleClick = (label: string) => {
    if (label === BUTTON_CLEAR) {
      setTokens([]);
      setCurrentToken({ type: "number", value: 0, raw: "0" });
      return;
    }

    if (numbersSet.has(label)) {
      // Prevent multiple decimal points
      if (
        label === BUTTON_DECIMAL &&
        currentToken.type === "number" &&
        currentToken.raw.includes(BUTTON_DECIMAL)
      ) {
        return;
      }

      if (currentToken.type !== "number") {
        setTokens([...tokens, currentToken]);
        setCurrentToken({ type: "number", value: Number(label), raw: label });
      } else {
        // Handle leading zeros: replace "0" with the new digit (unless it's a decimal)
        const newRaw =
          currentToken.raw === "0" && label !== BUTTON_DECIMAL
            ? label
            : `${currentToken.raw}${label}`;
        setCurrentToken({
          ...currentToken,
          value: Number(newRaw),
          raw: newRaw,
        });
      }
      return;
    }

    if (isBinaryOperator(label)) {
      if (currentToken.type !== "binaryOperator") {
        setTokens([...tokens, currentToken]);
      }
      setCurrentToken({ type: "binaryOperator", value: label });
      return;
    }

    if (isUnaryOperator(label)) {
      if (label === BUTTON_NEGATE && currentToken.type === "number") {
        const newValue = -currentToken.value;
        setCurrentToken({
          ...currentToken,
          value: newValue,
          raw: String(newValue),
        });
      } else if (label === BUTTON_PERCENT && currentToken.type === "number") {
        const newValue = currentToken.value / 100;
        setCurrentToken({
          ...currentToken,
          value: newValue,
          raw: String(newValue),
        });
      }
      return;
    }

    if (label === BUTTON_EQUALS) {
      if (currentToken.type !== "number") {
        return;
      }
      const result = evaluateRPN(infixToRPN([...tokens, currentToken]));
      setTokens([]);
      setCurrentToken({ type: "number", value: result, raw: String(result) });
      return;
    }
  };

  return (
    <div css={styles.container}>
      <div css={styles.resultContainer} role="status" aria-live="polite">
        {[...tokens, currentToken]
          .map((token) =>
            Number.isNaN(token.value) ? "Error" : String(token.value),
          )
          .join(" ")}
      </div>
      <div css={styles.buttonsContainer}>
        {buttons.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
            {row.map((label, buttonIndex) => (
              <div
                key={buttonIndex}
                css={label === BUTTON_ZERO && styles.zeroContainer}
              >
                <Button
                  css={[
                    styles.button,
                    label === BUTTON_ZERO && styles.zeroButton,
                    buttonIndex === row.length - 1 && styles.rowEndButton,
                  ]}
                  onClick={() => handleClick(label)}
                >
                  <span css={styles.buttonLabel}>{label}</span>
                </Button>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    height: "600px",
    aspectRatio: ratio.poster,
    borderRadius: border.radius_5,
    backgroundColor: color.backgroundRaised,
    overflow: "hidden",
    boxShadow: shadow._5,
    display: "flex",
    flexDirection: "column",
    containerType: "inline-size",
    // New CSS property, not yet recognized by stylex eslint plugin
    // eslint-disable-next-line @stylexjs/valid-styles
    cornerShape: "squircle",
  },
  resultContainer: {
    flexGrow: 1,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: space._3,
    fontSize: "calc(100cqMin / 8)",
  },
  buttonsContainer: {
    height: "80%",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gridTemplateRows: "repeat(5, 1fr)",
    gap: space._1,
    padding: space._3,
  },
  zeroContainer: {
    gridColumn: "span 2",
  },
  button: {
    height: "100%",
    aspectRatio: ratio.square,
    borderRadius: border.radius_round,
    borderWidth: 0,
    appearance: "unset",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
    [buttonTokens.backgroundColor]: color.backgroundCalculatorButton,
    [buttonTokens.backgroundColorHover]: color.backgroundCalculatorButton,
    filter: { ":hover": "brightness(1.1)" },
  },
  buttonLabel: {
    fontSize: "calc(100cqMin / 15)",
  },
  zeroButton: {
    borderRadius: "50cqh",
    width: "100%",
    height: "100%",
    aspectRatio: null,
  },
  rowEndButton: {
    backgroundColor: color.brandCalculator,
    [buttonTokens.backgroundColor]: color.brandCalculator,
    [buttonTokens.backgroundColorHover]: color.brandCalculator,
  },
});
