import type { binaryOperators } from "./constants";

export type BinaryOperator = (typeof binaryOperators)[number];

// Token types for expression parsing
export type NumberToken = { type: "number"; value: number; raw: string };
export type BinaryOperatorToken = {
  type: "binaryOperator";
  value: BinaryOperator;
};
export type Token = NumberToken | BinaryOperatorToken;
