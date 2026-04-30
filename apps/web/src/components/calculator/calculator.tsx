"use client";
import * as stylex from "@stylexjs/stylex";
import { Fragment, useState } from "react";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
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

// Visual layout for arrow-key navigation. Mirrors the rendered grid; the "0"
// button visually spans cols 0-1, so it appears twice here so navigating Down
// from "1" or "2" both land on it.
const VISUAL_GRID: readonly (readonly string[])[] = [
  [BUTTON_CLEAR, BUTTON_NEGATE, BUTTON_PERCENT, "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  [BUTTON_ZERO, BUTTON_ZERO, BUTTON_DECIMAL, BUTTON_EQUALS],
];

function getArrowDelta(key: string): readonly [number, number] | null {
  switch (key) {
    case "ArrowUp":
      return [-1, 0];
    case "ArrowDown":
      return [1, 0];
    case "ArrowLeft":
      return [0, -1];
    case "ArrowRight":
      return [0, 1];
    default:
      return null;
  }
}

function findGridPosition(label: string): readonly [number, number] | null {
  for (let row = 0; row < VISUAL_GRID.length; row++) {
    const cells = VISUAL_GRID[row];
    for (let col = 0; col < cells.length; col++) {
      if (cells[col] === label) return [row, col];
    }
  }
  return null;
}

function findButtonByLabel(
  wrapper: HTMLElement,
  label: string,
): HTMLButtonElement | null {
  const all = wrapper.querySelectorAll("button");
  for (const button of all) {
    if (button.textContent === label) return button;
  }
  return null;
}

function negateRaw(raw: string): string {
  if (Number(raw) === 0) return raw;
  return raw.startsWith("-") ? raw.slice(1) : `-${raw}`;
}

function percentRaw(raw: string): string {
  if (!raw.includes(".")) {
    return String(Number(raw) / 100);
  }
  const sign = raw.startsWith("-") ? "-" : "";
  const abs = sign ? raw.slice(1) : raw;
  const [intPart, fracPart = ""] = abs.split(".");
  const padded = intPart.padStart(2, "0");
  const shiftedInt = padded.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
  const shiftedFrac = padded.slice(-2) + fracPart;
  return `${sign}${shiftedInt}.${shiftedFrac}`;
}

export function Calculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentToken, setCurrentToken] = useState<Token>(createInitialToken);

  const isError =
    currentToken.type === "number" && Number.isNaN(currentToken.value);

  const handleBackspace = () => {
    if (isError) {
      setTokens([]);
      setCurrentToken(createInitialToken());
      return;
    }

    if (currentToken.type === "number") {
      const newRaw = currentToken.raw.slice(0, -1);
      if (newRaw === "" || newRaw === "-") {
        // Deleted the only digit (or the digit after a minus sign) — reset to 0
        setCurrentToken(createInitialToken());
      } else {
        setCurrentToken({
          ...currentToken,
          value: Number(newRaw),
          raw: newRaw,
        });
      }
      return;
    }

    // Current token is a binary operator — remove it and restore the previous number
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      setTokens(tokens.slice(0, -1));
      setCurrentToken(lastToken);
    } else {
      setCurrentToken(createInitialToken());
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    const wrapper = event.currentTarget;
    const buttonHasFocus = event.target instanceof HTMLButtonElement;

    // Enter/Space on a focused button: let the browser dispatch its native
    // click. Focus stays on the button.
    if ((key === "Enter" || key === " ") && buttonHasFocus) {
      return;
    }

    // Arrow keys move focus between buttons, skipping across the spanning "0".
    const arrowDelta = getArrowDelta(key);
    if (arrowDelta && event.target instanceof HTMLButtonElement) {
      event.preventDefault();
      const currentLabel = event.target.textContent;
      if (!currentLabel) return;
      const pos = findGridPosition(currentLabel);
      if (!pos) return;
      let row = pos[0];
      let col = pos[1];
      do {
        row += arrowDelta[0];
        col += arrowDelta[1];
        if (
          row < 0 ||
          row >= VISUAL_GRID.length ||
          col < 0 ||
          col >= VISUAL_GRID[row].length
        ) {
          return;
        }
      } while (VISUAL_GRID[row][col] === currentLabel);
      const next = findButtonByLabel(wrapper, VISUAL_GRID[row][col]);
      next?.focus();
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      handleBackspace();
      if (buttonHasFocus) wrapper.focus();
      return;
    }

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
      ".": ".",
      "%": "%",
    };

    if (key in keyMap) {
      event.preventDefault();
      handleClick(keyMap[key]);
      // Once the user starts driving the calculator from the keyboard, take
      // focus off the previously-clicked button so the next Enter is "=".
      if (buttonHasFocus) wrapper.focus();
    }
  };

  const handleClick = (label: string) => {
    if (label === BUTTON_CLEAR) {
      setTokens([]);
      setCurrentToken(createInitialToken());
      return;
    }

    // After an error (NaN), any input except AC should start fresh
    if (isError) {
      setTokens([]);
      if (numbersSet.has(label)) {
        setCurrentToken({ type: "number", value: Number(label), raw: label });
        return;
      }
      if (isBinaryOperator(label) || isUnaryOperator(label)) {
        setCurrentToken(createInitialToken());
        return;
      }
      // Equals after error: just reset
      if (label === BUTTON_EQUALS) {
        setCurrentToken(createInitialToken());
        return;
      }
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
        const newRaw = negateRaw(currentToken.raw);
        setCurrentToken({
          ...currentToken,
          value: Number(newRaw),
          raw: newRaw,
        });
      } else if (label === BUTTON_PERCENT && currentToken.type === "number") {
        const newRaw = percentRaw(currentToken.raw);
        setCurrentToken({
          ...currentToken,
          value: Number(newRaw),
          raw: newRaw,
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
      css={[flex.col, styles.container]}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={t({ en: "Calculator", zh: "计算器" })}
    >
      <CalculatorDisplay tokens={tokens} currentToken={currentToken} />
      <div css={styles.buttonsContainer}>
        {buttons.map((row) => (
          <Fragment key={row.join("")}>
            {row.map((label) => (
              <CalculatorButton
                key={label}
                label={label}
                isZero={label === BUTTON_ZERO}
                isRowEnd={label === row[row.length - 1]}
                onClick={() => {
                  handleClick(label);
                }}
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
    containerType: "inline-size",
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
