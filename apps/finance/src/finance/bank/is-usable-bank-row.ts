/** A bank row that can become an Entry on the linked account: same currency, not zero. */
export function isUsableBankRow(
  row: { currency: string; amountMinor: number },
  link: { currency: string },
) {
  return row.currency === link.currency && row.amountMinor !== 0;
}
