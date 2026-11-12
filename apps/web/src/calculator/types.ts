import type { binaryOperators } from "./constants";

export type BinaryOperator = (typeof binaryOperators)[number];

// Token types for expression parsing
type NumberToken = { type: "number"; value: number; raw: string };
type BinaryOperatorToken = {
  type: "binaryOperator";
  value: BinaryOperator;
};
export type Token = NumberToken | BinaryOperatorToken;
