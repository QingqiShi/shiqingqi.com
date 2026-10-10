const RATE = /^(?:\d+\.?\d{0,8}|\.\d{1,8})$/;

/** A rate a person typed (`0.79`, `７.２`), or null when it is not one `setFxRate` takes. */
export function parseFxRate(input: string): number | null {
  const text = input.normalize("NFKC").trim();
  if (!RATE.test(text)) return null;
  const rate = Number(text);
  return rate >= 1e-8 && rate <= 1e9 ? rate : null;
}

/** The text a rate field starts with: six significant figures, no trailing zeros. */
export function fxRateText(rate: number): string {
  return String(Number(rate.toPrecision(6)));
}

export interface FxRateField {
  /** The foreign currency: one unit of it is worth `current` of the base currency. */
  currency: string;
  current: number;
}

interface SetFxRateArgs {
  base: string;
  quote: string;
  on: string;
  rate: number;
}

/**
 * The `setFxRate` arguments for every rate field whose typed rate differs
 * from the one in use that day. A rate is stored as one unit of the foreign
 * currency in the base currency, the way the importer stores them.
 */
export function buildFxRateMutations(
  fields: readonly FxRateField[],
  inputs: ReadonlyMap<string, string>,
  baseCurrency: string,
  day: string,
): { rates: SetFxRateArgs[]; invalid: string[] } {
  const rates: SetFxRateArgs[] = [];
  const invalid: string[] = [];
  for (const field of fields) {
    const text = inputs.get(field.currency)?.trim() ?? "";
    if (text === "") continue;
    const rate = parseFxRate(text);
    if (rate === null) {
      invalid.push(field.currency);
      continue;
    }
    if (text === fxRateText(field.current)) continue;
    rates.push({ base: field.currency, quote: baseCurrency, on: day, rate });
  }
  return { rates, invalid };
}
