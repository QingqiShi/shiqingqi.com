import type { binaryOperators, unaryOperators } from "./constants";

export type BinaryOperator = (typeof binaryOperators)[number];
export type UnaryOperator = (typeof unaryOperators)[number];

// Token types for expression parsing
export type NumberToken = { type: "number"; value: number; raw: string };
export type BinaryOperatorToken = {
  type: "binaryOperator";
  value: BinaryOperator;
};
export type Token = NumberToken | BinaryOperatorToken;
