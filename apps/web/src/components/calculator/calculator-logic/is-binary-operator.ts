import { binaryOperatorsSet } from "../constants";
import type { BinaryOperator } from "../types";

export function isBinaryOperator(value: string): value is BinaryOperator {
  return binaryOperatorsSet.has(value);
}
