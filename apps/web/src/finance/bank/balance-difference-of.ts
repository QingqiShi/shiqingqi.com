/** What a link stores as its balance difference: the bank's balance less ours, or null when they agree. */
export function balanceDifferenceOf(
  bankBalanceMinor: number,
  oursMinor: number,
) {
  const difference = bankBalanceMinor - oursMinor;
  return difference === 0 ? null : difference;
}
