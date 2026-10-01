import { binaryOperatorsSet } from "#src/calculator/constants.ts";
import type { BinaryOperator } from "#src/calculator/types.ts";

export function isBinaryOperator(value: string): value is BinaryOperator {
  return binaryOperatorsSet.has(value);
}
