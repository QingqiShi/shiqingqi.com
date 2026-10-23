import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "../exchange-rates/supported-currencies.ts";

const COMMON_CURRENCIES = [
  "GBP",
  "EUR",
  "USD",
  "CNY",
  "HKD",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "SGD",
] as const;

/**
 * Each `kept` currency stays an option, also when it is not supported. Thus
 * an account made before Finance limited the currencies still shows its own.
 */
export function currencyOptions(
  base: string,
  used: Iterable<string>,
  kept: Iterable<string | undefined> = [],
): string[] {
  const options = new Set([base]);
  for (const code of [...used].sort()) {
    if (isSupportedCurrency(code)) options.add(code);
  }
  for (const code of COMMON_CURRENCIES) options.add(code);
  for (const code of SUPPORTED_CURRENCIES) options.add(code);
  for (const code of kept) if (code) options.add(code);
  return [...options];
}
