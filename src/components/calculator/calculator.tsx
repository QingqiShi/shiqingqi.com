"use client";
import * as stylex from "@stylexjs/stylex";
import { Fragment, useState } from "react";
import { border, color, ratio, shadow, space } from "#src/tokens.stylex.ts";
import { CalculatorButton } from "./calculator-button.tsx";
import { CalculatorDisplay } from "./calculator-display.tsx";
import {
  evaluateExpression,
  isBinaryOperator,
  isUnaryOperator,
} from "./calculator-logic.ts";
import type { Token } from "./types.ts";
import {
  BUTTON_CLEAR,
  BUTTON_DECIMAL,
  BUTTON_EQUALS,
  BUTTON_NEGATE,
  BUTTON_PERCENT,
  BUTTON_ZERO,
  buttons,
  numbersSet,
} from "./types.ts";

function createInitialToken(): Token {
  return { type: "number", value: 0, raw: "0" };
}

export function Calculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentToken, setCurrentToken] = useState<Token>(createInitialToken());

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key;
    const keyMap: Record<string, string> = {
      "0": "0",
      "1": "1",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      "6": "6",
      "7": "7",
      "8": "8",
      "9": "9",
      "+": "+",
      "-": "−",
      "*": "×",
      "/": "÷",
      Enter: "=",
      "=": "=",
      Escape: "ac",
      Backspace: "ac",
      ".": ".",
      "%": "%",
    };

    if (key in keyMap) {
      event.preventDefault();
      handleClick(keyMap[key]);
    }
  };

  const handleClick = (label: string) => {
    if (label === BUTTON_CLEAR) {
      setTokens([]);
      setCurrentToken(createInitialToken());
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
      const result = evaluateExpression([...tokens, currentToken]);
      setTokens([]);
      setCurrentToken({ type: "number", value: result, raw: String(result) });
      return;
    }
  };

  return (
    <div
      css={styles.container}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Calculator"
    >
      <CalculatorDisplay tokens={tokens} currentToken={currentToken} />
      <div css={styles.buttonsContainer}>
        {buttons.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
            {row.map((label, buttonIndex) => (
              <CalculatorButton
                key={buttonIndex}
                label={label}
                isZero={label === BUTTON_ZERO}
                isRowEnd={buttonIndex === row.length - 1}
                onClick={() => handleClick(label)}
              />
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
    outline: {
      ":focus-visible": `2px solid ${color.brandCalculator}`,
    },
    outlineOffset: {
      ":focus-visible": "2px",
    },
  },
  buttonsContainer: {
    height: "80%",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gridTemplateRows: "repeat(5, 1fr)",
    gap: space._1,
    padding: space._3,
  },
});
