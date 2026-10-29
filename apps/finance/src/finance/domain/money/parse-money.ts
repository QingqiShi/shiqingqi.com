import { currencyExponent } from "./currency-exponent.ts";
import { toMinorUnits } from "./to-minor-units.ts";

const GROUPED = /^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;
const PLAIN = /^(?:\d+\.?\d*|\.\d+)$/;
const CURRENCY_CODE = /^[a-z]{3}(?=[\s\d.\-+])|(?<=[\d.\s])[a-z]{3}$/i;
const MINUS_SIGNS = /[−‒–﹣－]/g;

/**
 * Reads an amount a person typed — `12.5`, `1,234.56`, `£3`, `-£3.20`,
 * `GBP 12`, `１２．５` — as integer minor units of `currency`. Commas only
 * group thousands, so `12,5` is not an amount. Returns `null` when the text is
 * not an amount, or has more decimal places than the currency allows.
 */
export function parseMoney(input: string, currency: string): number | null {
  let text = input.normalize("NFKC").replace(MINUS_SIGNS, "-").trim();
  text = text.replace(CURRENCY_CODE, "").replace(/\p{Sc}/gu, "");
  text = text.replace(/\s+/g, "");

  let sign = "";
  if (text.startsWith("-") || text.startsWith("+")) {
    sign = text.startsWith("-") ? "-" : "";
    text = text.slice(1);
  }

  if (!GROUPED.test(text) && !PLAIN.test(text)) return null;
  const decimal = text.replaceAll(",", "");
  const fraction = decimal.split(".")[1] ?? "";
  if (fraction.length > currencyExponent(currency)) return null;

  try {
    return toMinorUnits(`${sign}${decimal}`, currency);
  } catch {
    return null;
  }
}
