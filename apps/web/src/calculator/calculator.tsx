"use client";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, ratio, rhythm, shadow, space } from "@tuja/ui/tokens.stylex";
import { Fragment, useReducer } from "react";
import { brand } from "#src/brand/brand.stylex.ts";
import {
  calculatorReducer,
  initialCalculatorState,
} from "#src/calculator/calculator-logic/calculator-reducer.ts";
import { CalculatorButton } from "./calculator-button.tsx";
import { CalculatorDisplay } from "./calculator-display.tsx";
import {
  BUTTON_CLEAR,
  BUTTON_DECIMAL,
  BUTTON_EQUALS,
  BUTTON_NEGATE,
  BUTTON_PERCENT,
  BUTTON_ZERO,
  buttons,
} from "./constants.ts";

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

export function Calculator() {
  const [{ tokens, currentToken }, dispatch] = useReducer(
    calculatorReducer,
    initialCalculatorState,
  );

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
      dispatch({ type: "backspace" });
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
    dispatch({ type: "press", label });
  };

  return (
    <div
      css={[flex.col, corner.radius_5, styles.container]}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
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
    inlineSize: "min(25rem, 100%)",
    aspectRatio: ratio.poster,
    backgroundColor: color.card,
    overflow: "hidden",
    boxShadow: shadow._5,
    containerType: "inline-size",
    outline: {
      ":focus-visible": `${border.size_2} solid ${brand.calculator}`,
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
    gap: rhythm.tight,
    padding: space._3,
  },
});
