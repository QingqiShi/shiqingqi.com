/**
 * A bank amount as an Entry amount on the linked account: the bank amount
 * times the link's sign multiplier.
 *
 * Entries use one sign rule for every account: money out of the account is
 * negative, money in is positive. On a credit card a purchase is negative and
 * a repayment or refund positive, the same as on a current account, so a card
 * balance that is owed is negative. Lunch Flow sends amounts as the bank
 * reports them and does not say what kind of account it is. Most UK banks and
 * cards report spending as negative, so the multiplier is 1; it is -1 only
 * for a bank that reports spending as positive. The bank balance takes the
 * same multiplier.
 */
export function toEntryAmount(
  bankAmountMinor: number,
  link: { signMultiplier: number },
): number {
  return bankAmountMinor * link.signMultiplier;
}
