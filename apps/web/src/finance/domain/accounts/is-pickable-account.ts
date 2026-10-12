/** An account a member can pick for something new: open, and not In transit. */
export function isPickableAccount(account: {
  closedOn: string | null;
  isSystem: boolean;
}): boolean {
  return account.closedOn === null && !account.isSystem;
}
