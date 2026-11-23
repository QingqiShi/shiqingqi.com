import type { Instrument } from "../types.ts";

export type InstrumentLookup = (symbol: string) => Instrument;

export function instrumentOf(
  instruments: readonly Instrument[],
): InstrumentLookup {
  const find = optionalInstrumentOf(instruments);
  return (symbol) => {
    const instrument = find(symbol);
    if (!instrument) throw new Error(`No instrument for ${symbol}.`);
    return instrument;
  };
}

export function optionalInstrumentOf(
  instruments: readonly Instrument[],
): (symbol: string) => Instrument | undefined {
  const bySymbol = new Map(instruments.map((i) => [i.symbol, i]));
  return (symbol) => bySymbol.get(symbol);
}
