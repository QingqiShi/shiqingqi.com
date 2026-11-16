import {
  BUTTON_CLEAR,
  BUTTON_DECIMAL,
  BUTTON_EQUALS,
  BUTTON_NEGATE,
  BUTTON_PERCENT,
  numbersSet,
} from "#src/calculator/constants.ts";
import type { Token } from "#src/calculator/types.ts";
import { evaluateExpression } from "./evaluate-expression.ts";
import { isBinaryOperator } from "./is-binary-operator.ts";
import { isErrorToken } from "./is-error-token.ts";

export type CalculatorState = {
  tokens: Token[];
  currentToken: Token;
};

export type CalculatorAction =
  { type: "press"; label: string } | { type: "backspace" };

export const initialCalculatorState: CalculatorState = {
  tokens: [],
  currentToken: { type: "number", raw: "0" },
};

function startNumber(label: string): Token {
  return {
    type: "number",
    raw: label === BUTTON_DECIMAL ? `0${BUTTON_DECIMAL}` : label,
  };
}

function appendToNumber(raw: string, label: string): string {
  if (label === BUTTON_DECIMAL) {
    return raw.includes(BUTTON_DECIMAL) ? raw : `${raw}${label}`;
  }
  if (raw === "0") return label;
  if (raw === "-0") return `-${label}`;
  return `${raw}${label}`;
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

function press(state: CalculatorState, label: string): CalculatorState {
  const { tokens, currentToken } = state;

  if (label === BUTTON_CLEAR) return initialCalculatorState;

  if (isErrorToken(currentToken)) {
    return numbersSet.has(label)
      ? { tokens: [], currentToken: startNumber(label) }
      : initialCalculatorState;
  }

  if (numbersSet.has(label)) {
    if (currentToken.type !== "number") {
      return {
        tokens: [...tokens, currentToken],
        currentToken: startNumber(label),
      };
    }
    return {
      tokens,
      currentToken: {
        type: "number",
        raw: appendToNumber(currentToken.raw, label),
      },
    };
  }

  if (isBinaryOperator(label)) {
    return {
      tokens:
        currentToken.type === "binaryOperator"
          ? tokens
          : [...tokens, currentToken],
      currentToken: { type: "binaryOperator", value: label },
    };
  }

  if (currentToken.type !== "number") return state;

  switch (label) {
    case BUTTON_NEGATE:
      return {
        tokens,
        currentToken: { type: "number", raw: negateRaw(currentToken.raw) },
      };
    case BUTTON_PERCENT:
      return {
        tokens,
        currentToken: { type: "number", raw: percentRaw(currentToken.raw) },
      };
    case BUTTON_EQUALS:
      return {
        tokens: [],
        currentToken: {
          type: "number",
          raw: String(evaluateExpression([...tokens, currentToken])),
        },
      };
    default:
      return state;
  }
}

function backspace(state: CalculatorState): CalculatorState {
  const { tokens, currentToken } = state;

  if (isErrorToken(currentToken)) return initialCalculatorState;

  if (currentToken.type === "number") {
    const raw = currentToken.raw.slice(0, -1);
    return raw === "" || raw === "-"
      ? { tokens, currentToken: initialCalculatorState.currentToken }
      : { tokens, currentToken: { type: "number", raw } };
  }

  const previous = tokens.at(-1);
  return previous
    ? { tokens: tokens.slice(0, -1), currentToken: previous }
    : initialCalculatorState;
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  return action.type === "backspace"
    ? backspace(state)
    : press(state, action.label);
}
