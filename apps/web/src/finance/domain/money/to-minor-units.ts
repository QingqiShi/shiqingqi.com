import { currencyExponent } from "./currency-exponent.ts";

const DECIMAL = /^(-?)(\d*)(?:\.(\d*))?$/;

function decimalString(major: number, exponent: number): string {
  if (!Number.isFinite(major)) {
    throw new RangeError(`Not a finite amount: ${String(major)}`);
  }
  const shortest = String(major);
  return shortest.includes("e") ? major.toFixed(exponent + 6) : shortest;
}

/**
 * Converts a major-unit amount to integer minor units, rounding half to even
 * at the currency's exponent. A number is read as its shortest decimal form,
 * so `toMinorUnits(12.345, "GBP")` is 1234 and `toMinorUnits(12.355, "GBP")`
 * is 1236, whatever the binary value underneath.
 */
export function toMinorUnits(major: number | string, currency: string): number {
  const exponent = currencyExponent(currency);
  const text =
    typeof major === "number" ? decimalString(major, exponent) : major.trim();
  const match = DECIMAL.exec(text);
  const [, sign = "", whole = "", fraction = ""] = match ?? [];
  if (!match || (whole === "" && fraction === "")) {
    throw new SyntaxError(`Not a decimal amount: ${text}`);
  }

  const kept = fraction.slice(0, exponent).padEnd(exponent, "0");
  const dropped = fraction.slice(exponent);
  let minor = Number(`${whole}${kept}`);
  const firstDropped = dropped.charAt(0);
  const restIsZero = /^0*$/.test(dropped.slice(1));
  if (
    firstDropped > "5" ||
    (firstDropped === "5" && (!restIsZero || minor % 2 === 1))
  ) {
    minor += 1;
  }

  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Amount is too large: ${text}`);
  }
  return sign === "-" && minor !== 0 ? -minor : minor;
}

/** The major-unit value of `minor`, for arithmetic that leaves money, such as a chart scale. */
export function fromMinorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

/** `minor` as an exact decimal string in major units: `-123456` GBP is `"-1234.56"`. */
export function minorUnitsToDecimalString(
  minor: number,
  currency: string,
): string {
  const exponent = currencyExponent(currency);
  const digits = Math.abs(minor)
    .toString()
    .padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = digits.slice(digits.length - exponent);
  const sign = minor < 0 ? "-" : "";
  return exponent === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}
