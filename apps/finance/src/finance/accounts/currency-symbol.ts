import { displayLocale } from "../domain/dates/display-day.ts";

const symbols = new Map<string, string>();

/** The short mark of a currency in a locale: "£", "$", "¥", or the code when it has none. */
export function currencySymbol(currency: string, locale: string): string {
  const key = `${locale}|${currency}`;
  const cached = symbols.get(key);
  if (cached !== undefined) return cached;
  const symbol =
    new Intl.NumberFormat(displayLocale(locale), {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency;
  symbols.set(key, symbol);
  return symbol;
}
