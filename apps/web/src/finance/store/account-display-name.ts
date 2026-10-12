import type { AccountRow } from "../sync/row-schemas.ts";

/** The words a screen shows for the system accounts, from `t()` in render. */
export interface SystemAccountNames {
  inTransit: string;
}

/**
 * The name to show for an account. In transit keeps an English name in the
 * database, so it shows the translated word instead.
 */
export function accountDisplayName(
  account: Pick<AccountRow, "name" | "isSystem">,
  names: SystemAccountNames,
): string {
  return account.isSystem ? names.inTransit : account.name;
}
