const cents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const tenthsOfCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** A model cost in US dollars. Below a dollar it keeps a tenth of a cent, because one step often costs less than a cent. */
export function formatUsd(usd: number): string {
  return usd < 1 ? tenthsOfCents.format(usd) : cents.format(usd);
}
