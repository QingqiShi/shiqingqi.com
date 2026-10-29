import {
  sideOfKind,
  type AccountKind,
} from "../domain/accounts/side-of-kind.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";

/**
 * A liability's balance is negative, but a person types what they owe as a
 * positive amount (a phone's decimal keypad has no minus key). The field
 * shows and reads the balance times this sign.
 */
export function valuationInputSign(kind: AccountKind): 1 | -1 {
  return sideOfKind(kind) === "liability" ? -1 : 1;
}

/** `minor` as a decimal with its thousands grouped by commas, which `parseMoney` reads back. */
export function groupedDecimalText(minor: number, currency: string): string {
  const [whole, ...fraction] = minorUnitsToDecimalString(minor, currency).split(
    ".",
  );
  return [whole.replace(/\B(?=(\d{3})+$)/g, ","), ...fraction].join(".");
}

/** The text an update field starts with for a stored balance. */
export function valuationInputText(
  balance: number,
  kind: AccountKind,
  currency: string,
): string {
  return groupedDecimalText(balance * valuationInputSign(kind) || 0, currency);
}
