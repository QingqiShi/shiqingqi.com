/** In transit with nothing on its way, which the balance sheet and Reports leave out. */
export function isIdleSystemAccount(
  account: { isSystem: boolean },
  balance: number,
): boolean {
  return account.isSystem && balance === 0;
}
