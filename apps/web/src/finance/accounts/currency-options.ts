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
 * The currencies an account can pick: the Household's base currency first,
 * then the ones its accounts already use, then common ones. `current` is kept
 * even when it is none of these.
 */
export function currencyOptions(
  base: string,
  used: Iterable<string>,
  current?: string,
): string[] {
  const options = new Set([base]);
  for (const code of [...used].sort()) options.add(code);
  for (const code of COMMON_CURRENCIES) options.add(code);
  if (current) options.add(current);
  return [...options];
}
