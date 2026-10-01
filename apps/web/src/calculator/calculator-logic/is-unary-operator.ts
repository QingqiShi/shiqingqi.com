import { unaryOperatorsSet } from "#src/calculator/constants.ts";

export function isUnaryOperator(value: string): value is "±" | "%" {
  return unaryOperatorsSet.has(value);
}
