import { unaryOperatorsSet } from "../constants";

export function isUnaryOperator(value: string): value is "±" | "%" {
  return unaryOperatorsSet.has(value);
}
