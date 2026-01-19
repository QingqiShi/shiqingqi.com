// Button label constants
export const BUTTON_CLEAR = "ac";
export const BUTTON_NEGATE = "±";
export const BUTTON_PERCENT = "%";
export const BUTTON_EQUALS = "=";
export const BUTTON_DECIMAL = ".";
export const BUTTON_ZERO = "0";

// Button layout grid
export const buttons = [
  [BUTTON_CLEAR, BUTTON_NEGATE, BUTTON_PERCENT, "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  [BUTTON_ZERO, BUTTON_DECIMAL, BUTTON_EQUALS],
] as const;

// Operators
export const binaryOperators = ["+", "−", "×", "÷"] as const;
export type BinaryOperator = (typeof binaryOperators)[number];

export const unaryOperators = ["±", "%"] as const;
export type UnaryOperator = (typeof unaryOperators)[number];

export const binaryOperatorsSet = new Set<BinaryOperator>(binaryOperators);
export const unaryOperatorsSet = new Set<UnaryOperator>(unaryOperators);

// Number characters
export const numbersSet = new Set([
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

// Operator precedence for shunting-yard algorithm
export const operatorPrecedence: { [key in BinaryOperator]: number } = {
  "+": 1,
  "−": 1,
  "×": 2,
  "÷": 2,
};

// Token types for expression parsing
export type NumberToken = { type: "number"; value: number; raw: string };
export type BinaryOperatorToken = { type: "binaryOperator"; value: BinaryOperator };
export type Token = NumberToken | BinaryOperatorToken;
