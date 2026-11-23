const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeGbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/**
 * An amount in GBP. `signed` writes a plus or a minus sign in front, for a
 * change; `whole` drops the pence, for a large headline figure.
 */
export function formatMoney(
  amountGbp: number,
  { signed = false, whole = false }: { signed?: boolean; whole?: boolean } = {},
): string {
  const format = whole ? wholeGbp : gbp;
  const rounded = whole
    ? Math.round(amountGbp)
    : Math.round(amountGbp * 100) / 100;
  const text = format.format(Math.abs(rounded));
  if (rounded < 0) return `−${text}`;
  return signed && rounded > 0 ? `+${text}` : text;
}
